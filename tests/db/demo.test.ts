import { afterAll, describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import { planDemoDay, type DemoSnapshot } from "@/lib/demo/simulate";
import { londonParts } from "@/lib/clock";
import { addMember, as, createProject, expectError, inTransaction, pool, signUpUser } from "./helpers";

afterAll(() => pool?.end());

const aal2 = (id: string) => ({ id, aal: "aal2" as const });

// The same snapshot the app loads, read straight from the test transaction.
async function snapshot(db: PoolClient, projectId: string): Promise<DemoSnapshot> {
  const { rows: [project] } = await db.query(
    `select id, name, clock_offset_days, construction_start_date::text, is_demo, demo_started_at, demo_state
     from public.projects where id = $1`, [projectId]);
  const { rows: members } = await db.query(
    `select m.id, m.project_id, m.user_id, m.email, coalesce(nullif(p.full_name, ''), nullif(m.display_name, ''), m.email) as name,
            m.role, m.is_owner, m.chasing_paused, m.invited_at, coalesce(m.invited_at, m.created_at) as started_at, m.demo_persona
     from public.project_members m left join public.profiles p on p.id = m.user_id
     where m.project_id = $1 and m.removed_at is null`, [projectId]);
  const { rows: items } = await db.query(
    `select i.id, i.project_id, i.member_id, i.template_code as code, i.status, t.title, t.item_type, i.due_date
     from public.checklist_items i join public.duty_templates t on t.id = i.template_id
     where i.project_id = $1 and i.withdrawn_at is null`, [projectId]);
  const { rows: reminders } = await db.query(
    `select member_id, project_id, step_key, kind, recipient_email, project_day::text from public.reminders where project_id = $1`, [projectId]);
  const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);
  return {
    project: { ...project, demo_started_at: iso(project.demo_started_at) },
    members: members.map((m) => ({ ...m, invited_at: iso(m.invited_at), started_at: iso(m.started_at)! })),
    items,
    reminders,
  };
}

async function step(db: PoolClient, ownerId: string, projectId: string) {
  const day = planDemoDay(await snapshot(db, projectId), "https://dutyholder.test");
  await as(db, aal2(ownerId), () =>
    db.query("select public.demo_step($1, $2, $3, $4, $5)", [
      projectId, day.day, JSON.stringify(day.changes), JSON.stringify(day.emails), JSON.stringify(day.state),
    ]));
  return day;
}

describe("demo mode", () => {
  it("plays a demo through to all green, with each persona behaving as scripted", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner", "Olivia Owner");
      const { rows: [{ id: projectId }] } = await as(db, aal2(owner.id), () =>
        db.query("select public.create_demo_project() as id"));

      const days = [];
      for (let i = 0; i < 40; i++) {
        const d = await step(db, owner.id, projectId);
        days.push(d);
        if (d.allGreen) break;
      }
      const last = days.at(-1)!;
      expect(last.allGreen).toBe(true);
      expect(last.day).toBeLessThan(30);

      // Everything really is complete in the database.
      const { rows: [counts] } = await db.query(
        `select count(*)::int as total, count(*) filter (where status = 'complete')::int as done
         from public.checklist_items where project_id = $1 and withdrawn_at is null`, [projectId]);
      expect(counts.done).toBe(counts.total);

      // No emails at weekends; every demo email is simulated, never real.
      for (const d of days) {
        const weekday = londonParts(new Date(`${d.date}T12:00:00Z`)).weekday;
        if (["Sat", "Sun"].includes(weekday)) expect(d.emails).toEqual([]);
      }
      const { rows: [r] } = await db.query(
        "select count(*)::int as n, count(*) filter (where not simulated)::int as real from public.reminders where project_id = $1", [projectId]);
      expect(r.n).toBeGreaterThan(0);
      expect(r.real).toBe(0);

      // The fire engineer only acted after a second reminder.
      const { rows: [fire] } = await db.query(
        "select id from public.project_members where project_id = $1 and demo_persona = 'fire'", [projectId]);
      const fireReminders = await db.query(
        "select project_day::text from public.reminders where member_id = $1 order by project_day", [fire.id]);
      expect(fireReminders.rowCount).toBeGreaterThanOrEqual(2);
      const fireFirstAction = days.find((d) => d.events.some((e) => e.startsWith("Faye Fireside completed")))!;
      expect(fireFirstAction.date > fireReminders.rows[1].project_day).toBe(true);

      // The MEP engineer was asked for more information exactly once.
      expect(days.flatMap((d) => d.events).filter((e) => e.includes("asked Mo Mechanical for more information"))).toHaveLength(1);

      // The real scheduled job can't see the demo.
      const { rows: [state] } = await db.query("select public.chase_state() as s");
      expect(state.s.projects.some((p: { id: string }) => p.id === projectId)).toBe(false);
    }));

  it("only lets the demo's owner advance it, and only demo projects", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const stranger = await signUpUser(db, "stranger");
      const { rows: [{ id: demoId }] } = await as(db, aal2(owner.id), () => db.query("select public.create_demo_project() as id"));
      expect(await expectError(as(db, aal2(stranger.id), () =>
        db.query("select public.demo_step($1, 1, '[]', '[]', '{}')", [demoId])))).toMatch(/owner/);

      const realId = await createProject(db, owner.id);
      expect(await expectError(as(db, aal2(owner.id), () =>
        db.query("select public.demo_step($1, 1, '[]', '[]', '{}')", [realId])))).toMatch(/Only demo projects/);

      // Two tabs racing: the second step for the same day is refused.
      await as(db, aal2(owner.id), () => db.query("select public.demo_step($1, 1, '[]', '[]', '{}')", [demoId]));
      expect(await expectError(as(db, aal2(owner.id), () =>
        db.query("select public.demo_step($1, 1, '[]', '[]', '{}')", [demoId])))).toMatch(/moved on/);
    }));

  it("won't let the demo change a real person's tasks", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const real = await signUpUser(db, "real");
      const { rows: [{ id: demoId }] } = await as(db, aal2(owner.id), () => db.query("select public.create_demo_project() as id"));
      await addMember(db, owner.id, demoId, real.email, "contractor");
      const { rows: [item] } = await db.query(
        `select i.id from public.checklist_items i join public.project_members m on m.id = i.member_id
         where m.email = $1 limit 1`, [real.email]);
      expect(await expectError(as(db, aal2(owner.id), () =>
        db.query("select public.demo_step($1, 1, $2, '[]', '{}')", [demoId, JSON.stringify([{ item_id: item.id, status: "complete" }])]))))
        .toMatch(/fictional/);
    }));
});
