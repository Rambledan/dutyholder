import { afterAll, describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import { runChase, stripContext, type ChaseIO } from "@/lib/chase/run";
import type { ChaseState } from "@/lib/chase/plan";
import { addMember, as, createProject, expectError, inTransaction, pool, signUpUser } from "./helpers";

afterAll(() => pool?.end());

// The engine's database side, through the same SQL functions the cron route
// calls, but inside the test transaction. Limited to the test's own project.
function testIO(db: PoolClient, projectId: string, outbox: { to: string; cc: string[]; subject: string }[]): ChaseIO {
  return {
    async loadState() {
      const { rows } = await db.query("select public.chase_state() as s");
      const s = rows[0].s as ChaseState;
      const only = <T extends { project_id: string }>(xs: T[]) => xs.filter((x) => x.project_id === projectId);
      return {
        projects: s.projects.filter((p) => p.id === projectId),
        members: only(s.members),
        items: only(s.items),
        appointments: only(s.appointments),
        pending_signatures: only(s.pending_signatures),
        reminders: s.reminders,
      };
    },
    async claim(planned) {
      const { rows } = await db.query("select * from public.claim_reminders($1::jsonb)", [JSON.stringify(stripContext(planned))]);
      return rows;
    },
    async finish(ids, status, detail) {
      await db.query("select public.finish_reminders($1::uuid[], $2, $3)", [ids, status, detail]);
    },
    async send(message) {
      outbox.push({ to: message.to, cc: message.cc, subject: message.subject });
      return { sent: true, id: `test-${outbox.length}` };
    },
  };
}

// Next weekday at 10:00 UK time, so the run is inside working hours.
function nextWorkingMorning(): Date {
  const d = new Date();
  d.setUTCHours(10, 0, 0, 0);
  do d.setUTCDate(d.getUTCDate() + 1);
  while ([0, 6].includes(d.getUTCDay()));
  return d;
}
const plusDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

describe("chasing engine (done-when check)", () => {
  it("shifting an invite back a week sends the right reminder on the next run, once only", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner", "Olivia Owner");
      const sam = await signUpUser(db, "sam", "Sam Structures");
      const projectId = await createProject(db, owner.id);
      const samMember = await addMember(db, owner.id, projectId, sam.email, "designer");

      const run = nextWorkingMorning();
      // "Shift the dates back a week": Sam was invited 8 days before the run.
      await db.query("update public.project_members set invited_at = $1 where id = $2", [plusDays(run, -8), samMember]);

      const outbox: { to: string; cc: string[]; subject: string }[] = [];
      const io = testIO(db, projectId, outbox);

      const first = await runChase(io, "https://dutyholder.test", run);
      expect(first).toMatchObject({ claimed: 1, sent: 1 });
      expect(outbox).toEqual([{ to: sam.email, cc: [], subject: expect.stringContaining("Reminder") }]);
      const { rows: [r] } = await db.query("select step_key, status, sent_at from public.reminders where member_id = $1", [samMember]);
      expect(r).toMatchObject({ step_key: "reminder_7", status: "sent" });
      expect(r.sent_at).not.toBeNull();

      // Running again (same day, or the job firing twice) sends nothing.
      const second = await runChase(io, "https://dutyholder.test", run);
      expect(second.claimed).toBe(0);
      const third = await runChase(io, "https://dutyholder.test", plusDays(run, 1));
      expect(third.claimed).toBe(0);
      expect(outbox).toHaveLength(1);

      const audit = await db.query(
        "select count(*)::int as n from public.audit_log where project_id = $1 and action = 'reminder.sent'", [projectId]);
      expect(audit.rows[0].n).toBe(1);
    }));

  it("sends the firm reminder (owner copied) and the owner's digest at day 14", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner", "Olivia Owner");
      const sam = await signUpUser(db, "sam", "Sam Structures");
      const projectId = await createProject(db, owner.id);
      const samMember = await addMember(db, owner.id, projectId, sam.email, "designer");
      const run = nextWorkingMorning();
      await db.query("update public.project_members set invited_at = $1 where id = $2", [plusDays(run, -14), samMember]);

      const outbox: { to: string; cc: string[]; subject: string }[] = [];
      await runChase(testIO(db, projectId, outbox), "https://dutyholder.test", run);
      expect(outbox).toContainEqual({ to: sam.email, cc: [owner.email], subject: expect.stringContaining("Action needed") });
      expect(outbox).toContainEqual({ to: owner.email, cc: [], subject: expect.stringContaining("behind") });
    }));
});

describe("reminder access rules", () => {
  it("lets the owner and the person chased read reminders, nobody else", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const sam = await signUpUser(db, "sam");
      const other = await signUpUser(db, "other");
      const projectId = await createProject(db, owner.id);
      const samMember = await addMember(db, owner.id, projectId, sam.email, "designer");
      await addMember(db, owner.id, projectId, other.email, "contractor");
      await as(db, { id: owner.id, aal: "aal2" }, () => db.query("select public.record_manual_chase($1)", [samMember]));

      const sees = async (id: string) =>
        (await as(db, { id, aal: "aal2" }, () => db.query("select 1 from public.reminders where project_id = $1", [projectId]))).rowCount;
      expect(await sees(owner.id)).toBe(1);
      expect(await sees(sam.id)).toBe(1);
      expect(await sees(other.id)).toBe(0);
    }));

  it("keeps the engine's functions away from signed-in users", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      for (const sql of ["select public.chase_state()", "select * from public.claim_reminders('[]')",
        "select public.finish_reminders('{}', 'sent', 'x')"]) {
        expect(await expectError(as(db, { id: owner.id, aal: "aal2" }, () => db.query(sql)))).toMatch(/permission denied/);
      }
    }));

  it("allows one manual chase per person per day, by the owner only", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const sam = await signUpUser(db, "sam");
      const projectId = await createProject(db, owner.id);
      const samMember = await addMember(db, owner.id, projectId, sam.email, "designer");

      expect(await expectError(as(db, { id: sam.id, aal: "aal2" }, () =>
        db.query("select public.record_manual_chase($1)", [samMember])))).toMatch(/Only the project owner/);
      await as(db, { id: owner.id, aal: "aal2" }, () => db.query("select public.record_manual_chase($1)", [samMember]));
      expect(await expectError(as(db, { id: owner.id, aal: "aal2" }, () =>
        db.query("select public.record_manual_chase($1)", [samMember])))).toMatch(/Already chased today/);
    }));

  it("refuses to edit or delete a recorded reminder", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const sam = await signUpUser(db, "sam");
      const projectId = await createProject(db, owner.id);
      const samMember = await addMember(db, owner.id, projectId, sam.email, "designer");
      await as(db, { id: owner.id, aal: "aal2" }, () => db.query("select public.record_manual_chase($1)", [samMember]));
      await db.query("savepoint s");
      expect(await expectError(db.query("update public.reminders set step_key = 'x' where member_id = $1", [samMember])))
        .toMatch(/cannot be changed/);
      await db.query("rollback to savepoint s");
      expect(await expectError(db.query("delete from public.reminders where member_id = $1", [samMember]))).toMatch(/append-only/);
      await db.query("rollback to savepoint s");
    }));
});
