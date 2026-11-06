// Phase 8: statutory deadlines. Trigger dates start the 14-day, 28-day and
// 5-day clocks, construction can't start before both principal appointments
// are signed, and completion statements are signed with filled-in wording.
import { afterAll, describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import {
  activeCodesByEmail, addMember, as, createProject, expectError, inTransaction, itemId, pool, signUpUser,
  type ProjectOptions,
} from "./helpers";

afterAll(() => pool?.end());

const aal2 = (id: string) => ({ id, aal: "aal2" as const });

async function team(db: PoolClient, opts: ProjectOptions = {}) {
  const pd = await signUpUser(db, "pd", "Pat Designer");
  const client = await signUpUser(db, "client", "Chris Client");
  const designer = await signUpUser(db, "designer", "Dee Designer");
  const pc = await signUpUser(db, "pc", "Bea Builder");
  const projectId = await createProject(db, pd.id, opts);
  await addMember(db, pd.id, projectId, client.email, "client");
  await addMember(db, pd.id, projectId, designer.email, "designer");
  await addMember(db, pd.id, projectId, pc.email, opts.expectedContractors === 1 ? "contractor" : "principal_contractor");
  return { pd, client, designer, pc, projectId };
}

const memberId = async (db: PoolClient, projectId: string, email: string) =>
  (await db.query("select id from public.project_members where project_id = $1 and email = $2", [projectId, email])).rows[0].id as string;

// Issue an appointment and have the client and appointee sign it.
async function signAppointment(db: PoolClient, t: Awaited<ReturnType<typeof team>>, kind: "pd_appointment" | "pc_appointment") {
  const appointee = kind === "pd_appointment" ? t.pd : t.pc;
  const appointeeName = kind === "pd_appointment" ? "Pat Designer" : "Bea Builder";
  const appointeeMember = await memberId(db, t.projectId, appointee.email);
  const { rows: [{ id }] } = await as(db, aal2(t.pd.id), () =>
    db.query("select public.prepare_appointment($1, $2, $3, 'Appointment', 'Test letter', 'v1-test') as id",
      [t.projectId, kind, appointeeMember]));
  await as(db, aal2(t.client.id), () => db.query("select public.sign_appointment($1, 'appointer', 'Chris Client')", [id]));
  await as(db, aal2(appointee.id), () => db.query("select public.sign_appointment($1, 'appointee', $2)", [id, appointeeName]));
  return id as string;
}

// The project's date `days` from its today (computed as the database owner).
const dayFrom = async (db: PoolClient, projectId: string, days: number | null) =>
  days === null ? null
    : (await db.query("select (public.project_today($1) + $2::int)::text as d", [projectId, days])).rows[0].d as string;

// Owner sets project dates. `days` are relative to the project's today.
const setDates = async (db: PoolClient, ownerId: string, projectId: string, dates: Record<string, number | null>) => {
  for (const [column, days] of Object.entries(dates)) {
    const date = await dayFrom(db, projectId, days);
    await as(db, aal2(ownerId), () =>
      db.query(`update public.projects set ${column} = $2::date where id = $1`, [projectId, date]));
  }
};

const endAppointment = async (db: PoolClient, ownerId: string, member: string, days: number) => {
  const { rows: [m] } = await db.query("select project_id from public.project_members where id = $1", [member]);
  const date = await dayFrom(db, m.project_id, days);
  return as(db, aal2(ownerId), () =>
    db.query("update public.project_members set appointment_ended_on = $2::date where id = $1", [member, date]));
};

// Days from the project's today to the item's due date (null = no clock yet).
const dueIn = async (db: PoolClient, item: string) =>
  (await db.query(
    "select i.due_date - public.project_today(i.project_id) as d, i.due_date from public.checklist_items i where i.id = $1",
    [item])).rows[0].d as number | null;

describe("construction start (reg 11D(3))", () => {
  it("is refused until both principal appointments are signed", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      expect(await expectError(setDates(db, t.pd.id, t.projectId, { construction_started_on: -1 })))
        .toMatch(/must be signed before construction starts/);
      await signAppointment(db, t, "pd_appointment");
      expect(await expectError(setDates(db, t.pd.id, t.projectId, { construction_started_on: -1 })))
        .toMatch(/must be signed before construction starts/);
      await signAppointment(db, t, "pc_appointment");
      await setDates(db, t.pd.id, t.projectId, { construction_started_on: -1 });
      const { rows: [p] } = await db.query("select construction_started_on from public.projects where id = $1", [t.projectId]);
      expect(p.construction_started_on).not.toBeNull();
    }));

  it("needs no appointments with only one contractor", () =>
    inTransaction(async (db) => {
      const t = await team(db, { expectedContractors: 1 });
      await setDates(db, t.pd.id, t.projectId, { construction_started_on: 0 });
    }));

  it("refuses future dates, and completion before construction has started", () =>
    inTransaction(async (db) => {
      const t = await team(db, { expectedContractors: 1 });
      expect(await expectError(setDates(db, t.pd.id, t.projectId, { construction_started_on: 3 }))).toMatch(/future/);
      expect(await expectError(setDates(db, t.pd.id, t.projectId, { work_completed_on: 0 })))
        .toMatch(/Record when construction started/);
      await setDates(db, t.pd.id, t.projectId, { construction_started_on: -10 });
      expect(await expectError(setDates(db, t.pd.id, t.projectId, { work_completed_on: -11 }))).toMatch(/before construction started/);
    }));

  it("only lets the owner record dates", () =>
    inTransaction(async (db) => {
      const t = await team(db, { expectedContractors: 1 });
      const { rowCount } = await as(db, aal2(t.client.id), () =>
        db.query("update public.projects set bc_application_date = current_date - 1 where id = $1", [t.projectId]));
      expect(rowCount).toBe(0);
      const pdMember = await memberId(db, t.projectId, t.pd.email);
      const { rowCount: n } = await as(db, aal2(t.designer.id), () =>
        db.query("update public.project_members set appointment_ended_on = current_date where id = $1", [pdMember]));
      expect(n).toBe(0);
      // Without two-factor, even the owner is refused.
      const { rowCount: aal1 } = await as(db, { id: t.pd.id, aal: "aal1" }, () =>
        db.query("update public.projects set bc_application_date = current_date - 1 where id = $1", [t.projectId]));
      expect(aal1).toBe(0);
    }));
});

describe("28-day handover (reg 11M(5)(b), 11N(5)(b))", () => {
  it("starts when a principal's appointment ends, and only for principals", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const pdHandover = await itemId(db, t.projectId, t.pd.email, "PD-11M-HANDOVER");
      const pcHandover = await itemId(db, t.projectId, t.pc.email, "PC-11N-HANDOVER");
      expect(await dueIn(db, pdHandover)).toBeNull();

      await endAppointment(db, t.pd.id, await memberId(db, t.projectId, t.pd.email), -3);
      expect(await dueIn(db, pdHandover)).toBe(25);
      await endAppointment(db, t.pd.id, await memberId(db, t.projectId, t.pc.email), 0);
      expect(await dueIn(db, pcHandover)).toBe(28);

      expect(await expectError(endAppointment(db, t.pd.id, await memberId(db, t.projectId, t.designer.email), 0)))
        .toMatch(/Only a principal designer or principal contractor/);
      expect(await expectError(endAppointment(db, t.pd.id, await memberId(db, t.projectId, t.pc.email), 2)))
        .toMatch(/future/);

      const { rows } = await db.query(
        "select 1 from public.audit_log where project_id = $1 and action = 'deadline.updated'", [t.projectId]);
      expect(rows.length).toBeGreaterThan(0);
    }));
});

describe("5-day completion statements (reg 16(4), (4A))", () => {
  it("gives the client and every principal, current and former, a statement due 5 days after completion", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      await signAppointment(db, t, "pd_appointment");
      await signAppointment(db, t, "pc_appointment");

      // The first principal designer leaves; a replacement joins.
      await endAppointment(db, t.pd.id, await memberId(db, t.projectId, t.pd.email), -1);
      const pd2 = await signUpUser(db, "pd2", "Rae Replacement");
      await addMember(db, t.pd.id, t.projectId, pd2.email, "principal_designer");

      const codes = await activeCodesByEmail(db, t.projectId);
      expect(codes[t.client.email]).toContain("CL-16-COMPLETION");
      expect(codes[t.pd.email]).toContain("PD-16-COMPLETION");
      expect(codes[pd2.email]).toContain("PD-16-COMPLETION");
      expect(codes[t.pc.email]).toContain("PC-16-COMPLETION");
      expect(codes[t.designer.email]).not.toContain("PD-16-COMPLETION");

      const items = [
        await itemId(db, t.projectId, t.client.email, "CL-16-COMPLETION"),
        await itemId(db, t.projectId, t.pd.email, "PD-16-COMPLETION"),
        await itemId(db, t.projectId, pd2.email, "PD-16-COMPLETION"),
        await itemId(db, t.projectId, t.pc.email, "PC-16-COMPLETION"),
      ];
      for (const i of items) expect(await dueIn(db, i)).toBeNull();

      await setDates(db, t.pd.id, t.projectId, { construction_started_on: -1, work_completed_on: 0 });
      for (const i of items) expect(await dueIn(db, i)).toBe(5);
    }));

  it("can't be signed before completion, then signs the filled-in wording", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      await signAppointment(db, t, "pd_appointment");
      await signAppointment(db, t, "pc_appointment");
      const clientItem = await itemId(db, t.projectId, t.client.email, "CL-16-COMPLETION");
      const pdItem = await itemId(db, t.projectId, t.pd.email, "PD-16-COMPLETION");
      const sign = (userId: string, item: string, name: string) =>
        as(db, aal2(userId), () => db.query("select public.sign_acknowledgement($1, $2)", [item, name]));

      expect(await expectError(sign(t.client.id, clientItem, "Chris Client"))).toMatch(/hasn't been marked complete/);

      await setDates(db, t.pd.id, t.projectId, { construction_started_on: -2, work_completed_on: 0 });
      const { rows: [preview] } = await as(db, aal2(t.pd.id), () =>
        db.query("select public.statement_to_sign($1) as text", [pdItem]));
      expect(preview.text).toMatch(/I, Pat Designer, state that I was appointed as principal designer for this project from/);
      expect(preview.text).toMatch(/fulfilled my duties as principal designer under Part 2A/);

      // Someone else's statement can't be previewed or signed.
      expect(await expectError(as(db, aal2(t.designer.id), () =>
        db.query("select public.statement_to_sign($1)", [pdItem])))).toMatch(/not yours/);

      await sign(t.client.id, clientItem, "Chris Client");
      await sign(t.pd.id, pdItem, "Pat Designer");
      const { rows: sigs } = await db.query(
        "select template_code, statement from public.signatures where checklist_item_id = any($1) order by template_code",
        [[clientItem, pdItem]]);
      expect(sigs[0].statement).toMatch(/to the best of my knowledge, the work complies/);
      expect(sigs[1].statement).toBe(preview.text);
    }));

  it("with one contractor, gives the agreed lead designer the statement and the sole contractor signs as principal contractor", () =>
    inTransaction(async (db) => {
      const t = await team(db, { expectedContractors: 1 });
      await setDates(db, t.pd.id, t.projectId, { construction_started_on: -2, work_completed_on: 0 });
      // No principal appointments with one contractor, so nobody has the
      // principal designer's statement until a lead designer is agreed.
      expect((await activeCodesByEmail(db, t.projectId))[t.pd.email]).not.toContain("PD-16-COMPLETION");

      const lead = await memberId(db, t.projectId, t.designer.email);
      const { rows: [{ id }] } = await as(db, aal2(t.pd.id), () =>
        db.query("select public.prepare_appointment($1, 'lead_designer_agreement', $2, 'Agreement', 'Test agreement', 'v1-test') as id",
          [t.projectId, lead]));
      await as(db, aal2(t.designer.id), () => db.query("select public.sign_appointment($1, 'designer', 'Dee Designer')", [id]));
      await as(db, aal2(t.pd.id), () => db.query("select public.sign_appointment($1, 'designer', 'Pat Designer')", [id]));

      const codes = await activeCodesByEmail(db, t.projectId);
      expect(codes[t.designer.email]).toContain("PD-16-COMPLETION");
      expect(codes[t.pd.email]).not.toContain("PD-16-COMPLETION");
      const leadItem = await itemId(db, t.projectId, t.designer.email, "PD-16-COMPLETION");
      expect(await dueIn(db, leadItem)).toBe(5);
      const { rows: [l] } = await as(db, aal2(t.designer.id), () =>
        db.query("select public.statement_to_sign($1) as text", [leadItem]));
      expect(l.text).toMatch(/I, Dee Designer, state that I was the lead designer for this project, agreed in writing under regulation 11D\(7\)/);

      const pcItem = await itemId(db, t.projectId, t.pc.email, "PC-16-COMPLETION");
      const { rows: [s] } = await as(db, aal2(t.pc.id), () =>
        db.query("select public.statement_to_sign($1) as text", [pcItem]));
      expect(s.text).toMatch(/sole contractor .* regulation 11D\(6\)/);
    }));

  it("refuses a principal designer statement without a recorded appointment", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      await signAppointment(db, t, "pd_appointment");
      await signAppointment(db, t, "pc_appointment");
      // A second principal designer joins without an appointment letter.
      const pd2 = await signUpUser(db, "pd2", "Rae Replacement");
      await addMember(db, t.pd.id, t.projectId, pd2.email, "principal_designer");
      await setDates(db, t.pd.id, t.projectId, { construction_started_on: -2, work_completed_on: 0 });
      const item = await itemId(db, t.projectId, pd2.email, "PD-16-COMPLETION");
      expect(await expectError(as(db, aal2(pd2.id), () =>
        db.query("select public.sign_acknowledgement($1, 'Rae Replacement')", [item])))).toMatch(/isn't recorded/);
    }));
});

describe("early occupation (reg 16(5)) and building control notice (reg 11O)", () => {
  it("adds a notice due 5 days before occupation, and withdraws it if the date is cleared", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      expect((await activeCodesByEmail(db, t.projectId))[t.pc.email]).not.toContain("PC-16-OCCUPATION");
      await setDates(db, t.pd.id, t.projectId, { occupation_date: 20 });
      const item = await itemId(db, t.projectId, t.pc.email, "PC-16-OCCUPATION");
      expect(await dueIn(db, item)).toBe(15);
      await setDates(db, t.pd.id, t.projectId, { occupation_date: null });
      expect((await activeCodesByEmail(db, t.projectId))[t.pc.email]).not.toContain("PC-16-OCCUPATION");
    }));

  it("starts the 14-day clock from a principal appointment made after the building control application", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const notify = await itemId(db, t.projectId, t.client.email, "CL-11O-NOTIFY");
      await signAppointment(db, t, "pd_appointment");
      // Appointed before any application: nothing to notify.
      expect(await dueIn(db, notify)).toBeNull();
      await setDates(db, t.pd.id, t.projectId, { bc_application_date: -5 });
      expect(await dueIn(db, notify)).toBe(14);
    }));
});
