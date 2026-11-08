// Phase 10: the Relevant Requirements Tracker. The principal designer
// coordinates (relevance, owners); each designer writes only their own rows.
import { afterAll, describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import { addMember, as, createProject, expectError, inTransaction, pool, signUpUser } from "./helpers";

afterAll(() => pool?.end());

const aal2 = (id: string) => ({ id, aal: "aal2" as const });

async function team(db: PoolClient) {
  const pd = await signUpUser(db, "pd", "Pat Designer");
  const fire = await signUpUser(db, "fire", "Fay Fire");
  const structural = await signUpUser(db, "structural", "Sam Structures");
  const outsider = await signUpUser(db, "outsider", "Olly Outsider");
  const projectId = await createProject(db, pd.id);
  await addMember(db, pd.id, projectId, fire.email, "designer");
  await addMember(db, pd.id, projectId, structural.email, "designer");
  const member = async (email: string) =>
    (await db.query("select id from public.project_members where project_id = $1 and email = $2", [projectId, email])).rows[0].id as string;
  const fireMember = await member(fire.email);
  const structuralMember = await member(structural.email);
  await as(db, aal2(pd.id), () => db.query("update public.project_members set discipline = 'fire' where id = $1", [fireMember]));
  await as(db, aal2(pd.id), () => db.query("update public.project_members set discipline = 'structural' where id = $1", [structuralMember]));
  return { pd, fire, structural, outsider, projectId, fireMember, structuralMember };
}

const row = async (db: PoolClient, projectId: string, ref: string) =>
  (await db.query(
    `select pr.id from public.project_requirements pr join public.requirements r on r.id = pr.requirement_id
     where pr.project_id = $1 and r.ref = $2 order by r.sort_order limit 1`, [projectId, ref])).rows[0].id as string;

const assign = (db: PoolClient, userId: string, id: string, owner: string | null) =>
  as(db, aal2(userId), () => db.query("select public.assign_requirement($1, $2, null, null, null, null)", [id, owner]));

const answer = (db: PoolClient, userId: string, id: string, status: string, application = "Stay-put strategy, L2 alarm, see fire strategy rev B.") =>
  as(db, aal2(userId), () => db.query(
    "select public.save_requirement_answer($1, 'approved_document', 'ADB Vol 1 2019', 'Standard wording', $2, 'See report', $3)",
    [id, application, status]));

describe("the requirements catalogue", () => {
  it("has the 165 seed rows plus regs 44E-44I, with no placeholder text", () =>
    inTransaction(async (db) => {
      const { rows: [c] } = await db.query("select count(*)::int as n from public.requirements");
      expect(c.n).toBe(170);
      const { rows } = await db.query("select ref from public.requirements where sheet = 'Part 9B-Regs 44E-44I' order by seq");
      expect(rows.map((r) => r.ref)).toEqual(["R44E", "R44F", "R44G", "R44H", "R44I"]);
      const { rowCount } = await db.query("select 1 from public.requirements where requirement_text ilike '%under review for inclusion%'");
      expect(rowCount).toBe(0);
    }));

  it("is read-only and needs two-factor", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      expect((await as(db, aal2(t.fire.id), () => db.query("select 1 from public.requirements"))).rowCount).toBe(170);
      expect((await as(db, { id: t.fire.id, aal: "aal1" }, () => db.query("select 1 from public.requirements"))).rowCount).toBe(0);
      expect(await expectError(db.query("update public.requirements set ref = 'x' where ref = 'B1'"))).toMatch(/append-only|cannot|not allowed/i);
    }));
});

describe("each project's tracker", () => {
  it("is created with the project, visible to members only and only after two-factor", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const { rows: [c] } = await db.query("select count(*)::int as n from public.project_requirements where project_id = $1", [t.projectId]);
      expect(c.n).toBe(170);
      const q = "select 1 from public.project_requirements where project_id = $1";
      expect((await as(db, aal2(t.fire.id), () => db.query(q, [t.projectId]))).rowCount).toBe(170);
      expect((await as(db, aal2(t.outsider.id), () => db.query(q, [t.projectId]))).rowCount).toBe(0);
      expect((await as(db, { id: t.fire.id, aal: "aal1" }, () => db.query(q, [t.projectId]))).rowCount).toBe(0);
      // Nobody writes directly.
      expect(await expectError(as(db, aal2(t.pd.id), () =>
        db.query("update public.project_requirements set status = 'granted' where project_id = $1", [t.projectId])))).toMatch(/permission denied/);
    }));

  it("lets only the coordinator decide relevance, with a reason for 'not relevant'", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const e4 = await row(db, t.projectId, "E4");
      const set = (userId: string, relevance: string, reason: string) =>
        as(db, aal2(userId), () => db.query("select public.set_requirement_relevance($1, $2, $3)", [[e4], relevance, reason]));
      expect(await expectError(set(t.fire.id, "relevant", ""))).toMatch(/Only the principal designer/);
      expect(await expectError(set(t.pd.id, "not_relevant", "  "))).toMatch(/reason/);
      await set(t.pd.id, "not_relevant", "The building is offices, not a school.");
      const { rows: [r] } = await db.query("select relevance, relevance_reason, relevance_by from public.project_requirements where id = $1", [e4]);
      expect(r).toMatchObject({ relevance: "not_relevant", relevance_reason: "The building is offices, not a school.", relevance_by: t.pd.id });
    }));

  it("assigns by discipline where exactly one person fits", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      await as(db, aal2(t.pd.id), () => db.query("select public.assign_requirements_by_discipline($1)", [t.projectId]));
      const owners = async (sheet: string) => (await db.query(
        `select distinct pr.owner_member_id from public.project_requirements pr join public.requirements r on r.id = pr.requirement_id
         where pr.project_id = $1 and r.sheet = $2`, [t.projectId, sheet])).rows.map((r) => r.owner_member_id);
      expect(await owners("Sch.1-Part B")).toEqual([t.fireMember]);
      expect(await owners("Sch.1-Part A")).toEqual([t.structuralMember]);
      expect(await owners("Sch.1-Part H")).toEqual([null]); // no civil engineer on the team
    }));

  it("lets only the responsible designer write the answer, not the principal designer", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const b1 = await row(db, t.projectId, "B1");
      expect(await expectError(assign(db, t.fire.id, b1, t.fireMember))).toMatch(/Only the principal designer/);
      await assign(db, t.pd.id, b1, t.fireMember);

      expect(await expectError(answer(db, t.structural.id, b1, "design_in_progress"))).toMatch(/Only the designer responsible/);
      expect(await expectError(answer(db, t.pd.id, b1, "design_in_progress"))).toMatch(/Only the designer responsible/);

      // The project-specific answer is required beyond "design in progress".
      await answer(db, t.fire.id, b1, "design_in_progress", "");
      expect(await expectError(answer(db, t.fire.id, b1, "ready_for_submission", " "))).toMatch(/how this applies to this project/);
      await answer(db, t.fire.id, b1, "ready_for_submission");

      const { rows: [r] } = await db.query("select status, route, updated_by from public.project_requirements where id = $1", [b1]);
      expect(r).toMatchObject({ status: "ready_for_submission", route: "approved_document", updated_by: t.fire.id });
      const { rows } = await db.query("select action from public.audit_log where entity_id = $1 order by occurred_at", [b1]);
      expect(rows.map((a) => a.action)).toEqual(["requirement.assigned", "requirement.answered", "requirement.answered"]);
    }));

  it("refuses answers on a 'not relevant' row, and owners from outside the project", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const b1 = await row(db, t.projectId, "B1");
      await assign(db, t.pd.id, b1, t.fireMember);
      await as(db, aal2(t.pd.id), () => db.query("select public.set_requirement_relevance($1, 'not_relevant', 'No building work affects this')", [[b1]]));
      expect(await expectError(answer(db, t.fire.id, b1, "design_in_progress"))).toMatch(/not relevant/);

      const other = await createProject(db, t.outsider.id);
      const { rows: [m] } = await db.query("select id from public.project_members where project_id = $1", [other]);
      expect(await expectError(assign(db, t.pd.id, b1, m.id))).toMatch(/Choose someone on the project/);
    }));
});
