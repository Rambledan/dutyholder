import { afterAll, describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import {
  addMember, as, createProject, expectError, inTransaction, itemId, pool, signUpUser, type ProjectOptions,
} from "./helpers";

afterAll(() => pool?.end());

const aal2 = (id: string) => ({ id, aal: "aal2" as const });

// Owner (principal designer) with a client, designer, principal contractor
// and contractor, all signed up.
async function team(db: PoolClient, opts: ProjectOptions = {}) {
  const pd = await signUpUser(db, "pd", "Pat Designer");
  const client = await signUpUser(db, "client", "Chris Client");
  const designer = await signUpUser(db, "designer", "Dee Designer");
  const pc = await signUpUser(db, "pc", "Bea Builder");
  const contractor = await signUpUser(db, "contractor", "Eddie Electric");
  const projectId = await createProject(db, pd.id, opts);
  await addMember(db, pd.id, projectId, client.email, "client");
  await addMember(db, pd.id, projectId, designer.email, "designer");
  await addMember(db, pd.id, projectId, pc.email, opts.expectedContractors === 1 ? "contractor" : "principal_contractor");
  if (opts.expectedContractors !== 1) await addMember(db, pd.id, projectId, contractor.email, "contractor");
  return { pd, client, designer, pc, contractor, projectId };
}

async function submitCompetence(db: PoolClient, user: { id: string; email: string }, projectId: string) {
  const me = aal2(user.id);
  await as(db, me, () => db.query("select public.start_competence_draft()"));
  await as(db, me, () =>
    db.query(`update public.competence_statements set skills = 's', knowledge = 'k', experience = 'e',
      behaviour_compliance = 'c', behaviour_cooperation = 'co', behaviour_limits = 'l'
      where user_id = $1 and status = 'draft'`, [user.id]));
  const item = await itemId(db, projectId, user.email, "ALL-11F-COMPETENCE");
  await as(db, me, () => db.query("select public.submit_competence($1)", [item]));
  return item;
}

const status = async (db: PoolClient, id: string) =>
  (await db.query("select status from public.checklist_items where id = $1", [id])).rows[0].status;

const review = (db: PoolClient, reviewerId: string, item: string, decision: string, note = "") =>
  as(db, aal2(reviewerId), () => db.query("select public.review_competence($1, $2, $3)", [item, decision, note]));

describe("competence reviews", () => {
  it("lets the client review: records the decision and the version's fingerprint", () =>
    inTransaction(async (db) => {
      const { client, designer, projectId } = await team(db);
      const item = await submitCompetence(db, designer, projectId);

      // The client can read the submitted statement to review it.
      const seen = await as(db, aal2(client.id), () =>
        db.query("select 1 from public.competence_statements where user_id = $1", [designer.id]));
      expect(seen.rowCount).toBe(1);

      await review(db, client.id, item, "satisfied", "Chartered, relevant experience");
      expect(await status(db, item)).toBe("complete");
      const { rows: [r] } = await db.query("select decision, statement_version, statement_sha256 from public.reviews where checklist_item_id = $1", [item]);
      expect(r.decision).toBe("satisfied");
      expect(r.statement_version).toBe(1);
      expect(r.statement_sha256).toMatch(/^[0-9a-f]{64}$/);
    }));

  it("refuses non-reviewers and self-review", () =>
    inTransaction(async (db) => {
      const { pd, designer, pc, projectId } = await team(db);
      const designersItem = await submitCompetence(db, designer, projectId);
      expect(await expectError(review(db, pc.id, designersItem, "satisfied"))).toMatch(/Only the project owner or the client/);

      const ownItem = await submitCompetence(db, pd, projectId);
      expect(await expectError(review(db, pd.id, ownItem, "satisfied"))).toMatch(/your own/);
    }));

  it("needs a note for 'needs more info', and then a new version before resubmitting", () =>
    inTransaction(async (db) => {
      const { client, designer, projectId } = await team(db);
      const item = await submitCompetence(db, designer, projectId);
      expect(await expectError(review(db, client.id, item, "needs_info", " "))).toMatch(/what more information/);

      await review(db, client.id, item, "needs_info", "Please add your PI insurance certificate");
      expect(await status(db, item)).toBe("needs_info");
      expect(await expectError(as(db, aal2(designer.id), () => db.query("select public.submit_competence($1)", [item]))))
        .toMatch(/Update your statement/);

      await submitCompetence(db, designer, projectId);
      expect(await status(db, item)).toBe("submitted");
      const { rows: [s] } = await db.query(
        "select s.version from public.checklist_items i join public.competence_statements s on s.id = i.competence_statement_id where i.id = $1", [item]);
      expect(s.version).toBe(2);
    }));

  it("shows reviews to the reviewed person and reviewers only", () =>
    inTransaction(async (db) => {
      const { pd, client, designer, pc, projectId } = await team(db);
      const item = await submitCompetence(db, designer, projectId);
      await review(db, client.id, item, "satisfied");
      const sees = async (id: string) =>
        (await as(db, aal2(id), () => db.query("select 1 from public.reviews where checklist_item_id = $1", [item]))).rowCount;
      expect(await sees(designer.id)).toBe(1);
      expect(await sees(client.id)).toBe(1);
      expect(await sees(pd.id)).toBe(1);
      expect(await sees(pc.id)).toBe(0);
    }));

  it("ticks off the client's review duties once everyone is satisfied, and reopens when someone joins", () =>
    inTransaction(async (db) => {
      const { pd, client, designer, contractor, projectId } = await team(db);
      const engaged = await itemId(db, projectId, client.email, "CL-11E-REVIEW-ENGAGED");

      const d = await submitCompetence(db, designer, projectId);
      await review(db, client.id, d, "satisfied");
      expect(await status(db, engaged)).toBe("in_progress");

      const c = await submitCompetence(db, contractor, projectId);
      await review(db, client.id, c, "satisfied");
      expect(await status(db, engaged)).toBe("complete");

      await addMember(db, pd.id, projectId, "late-designer@example.test", "designer");
      expect(await status(db, engaged)).toBe("in_progress");
    }));

  it("sends competence back for review when the person reports a change", () =>
    inTransaction(async (db) => {
      const { client, designer, pc, projectId } = await team(db);
      const item = await submitCompetence(db, designer, projectId);
      await review(db, client.id, item, "satisfied");

      expect(await expectError(as(db, aal2(designer.id), () =>
        db.query("select public.report_competence_change($1, ' ')", [projectId])))).toMatch(/Describe/);
      await as(db, aal2(designer.id), () =>
        db.query("select public.report_competence_change($1, 'My PI insurance has lapsed')", [projectId]));
      expect(await status(db, item)).toBe("needs_info");

      const sees = async (id: string) =>
        (await as(db, aal2(id), () => db.query("select 1 from public.competence_change_reports where project_id = $1", [projectId]))).rowCount;
      expect(await sees(client.id)).toBe(1);
      expect(await sees(pc.id)).toBe(0);
    }));
});

const LETTER = "Dear Pat, the client appoints you as principal designer... (test letter)";

const prepare = (db: PoolClient, ownerId: string, projectId: string, kind: string, appointeeMemberId: string) =>
  as(db, aal2(ownerId), () =>
    db.query("select public.prepare_appointment($1, $2, $3, 'Appointment', $4, 'v1-test') as id",
      [projectId, kind, appointeeMemberId, LETTER])).then((r) => r.rows[0].id as string);

const memberId = async (db: PoolClient, projectId: string, email: string) =>
  (await db.query("select id from public.project_members where project_id = $1 and email = $2", [projectId, email])).rows[0].id as string;

const sign = (db: PoolClient, userId: string, appointmentId: string, party: string, name: string) =>
  as(db, aal2(userId), () => db.query("select public.sign_appointment($1, $2, $3)", [appointmentId, party, name]));

describe("appointments", () => {
  it("issues a PD appointment for the client and the appointee to sign, then completes it", () =>
    inTransaction(async (db) => {
      const { pd, client, projectId } = await team(db);
      const appointment = await prepare(db, pd.id, projectId, "pd_appointment", await memberId(db, projectId, pd.email));
      const clientItem = await itemId(db, projectId, client.email, "CL-11D-APPOINT-PD");
      expect(await status(db, clientItem)).toBe("in_progress");

      const { rows: parties } = await db.query(
        "select party from public.appointment_signatories where appointment_id = $1 order by party", [appointment]);
      expect(parties.map((p) => p.party)).toEqual(["appointee", "appointer"]);

      expect(await expectError(sign(db, client.id, appointment, "appointer", "Not Chris"))).toMatch(/exactly as it appears/);
      await sign(db, client.id, appointment, "appointer", "Chris Client");
      expect(await expectError(sign(db, client.id, appointment, "appointer", "Chris Client"))).toMatch(/nothing here/);
      let { rows: [a] } = await db.query("select status from public.appointments where id = $1", [appointment]);
      expect(a.status).toBe("awaiting_signatures");

      await sign(db, pd.id, appointment, "appointee", "Pat Designer");
      ({ rows: [a] } = await db.query("select status, completed_at from public.appointments where id = $1", [appointment]));
      expect(a.status).toBe("signed");
      expect(await status(db, clientItem)).toBe("complete");

      const { rows: sigs } = await db.query(
        "select distinct letter_sha256 from public.appointment_signatures where appointment_id = $1", [appointment]);
      expect(sigs).toHaveLength(1);
    }));

  it("only lets the owner prepare, with the right appointee and project type", () =>
    inTransaction(async (db) => {
      const { pd, client, designer, projectId } = await team(db);
      const pdMember = await memberId(db, projectId, pd.email);
      expect(await expectError(prepare(db, client.id, projectId, "pd_appointment", pdMember))).toMatch(/Only the project owner/);
      expect(await expectError(prepare(db, pd.id, projectId, "pd_appointment", await memberId(db, projectId, designer.email))))
        .toMatch(/right role/);
      expect(await expectError(prepare(db, pd.id, projectId, "lead_designer_agreement", pdMember))).toMatch(/one contractor/);
      expect(await expectError(prepare(db, pd.id, projectId, "cdm_certification", pdMember))).toMatch(/CDM/);

      await prepare(db, pd.id, projectId, "pd_appointment", pdMember);
      expect(await expectError(prepare(db, pd.id, projectId, "pd_appointment", pdMember))).toMatch(/duplicate|unique/i);
    }));

  it("refuses signatures from anyone not named, freezes the letter, and keeps signatures permanent", () =>
    inTransaction(async (db) => {
      const { pd, client, designer, projectId } = await team(db);
      const appointment = await prepare(db, pd.id, projectId, "pd_appointment", await memberId(db, projectId, pd.email));
      expect(await expectError(sign(db, designer.id, appointment, "appointer", "Dee Designer"))).toMatch(/nothing here/);
      await sign(db, client.id, appointment, "appointer", "Chris Client");

      await db.query("savepoint s");
      expect(await expectError(db.query("update public.appointments set letter_text = 'changed' where id = $1", [appointment])))
        .toMatch(/cannot be edited/);
      await db.query("rollback to savepoint s");
      expect(await expectError(db.query("delete from public.appointment_signatures where appointment_id = $1", [appointment])))
        .toMatch(/append-only/);
      await db.query("rollback to savepoint s");
    }));

  it("collects every designer's signature on a lead designer agreement", () =>
    inTransaction(async (db) => {
      const { pd, designer, projectId } = await team(db, { expectedContractors: 1 });
      const lead = await memberId(db, projectId, designer.email);
      const appointment = await prepare(db, pd.id, projectId, "lead_designer_agreement", lead);

      await sign(db, designer.id, appointment, "designer", "Dee Designer");
      expect(await status(db, await itemId(db, projectId, designer.email, "DES-11D-LEAD"))).toBe("complete");
      let { rows: [a] } = await db.query("select status from public.appointments where id = $1", [appointment]);
      expect(a.status).toBe("awaiting_signatures");

      await sign(db, pd.id, appointment, "designer", "Pat Designer");
      ({ rows: [a] } = await db.query("select status from public.appointments where id = $1", [appointment]));
      expect(a.status).toBe("signed");
    }));

  it("voids an appointment with a reason and reopens the duty", () =>
    inTransaction(async (db) => {
      const { pd, client, projectId } = await team(db);
      const pdMember = await memberId(db, projectId, pd.email);
      const appointment = await prepare(db, pd.id, projectId, "pd_appointment", pdMember);
      expect(await expectError(as(db, aal2(client.id), () =>
        db.query("select public.void_appointment($1, 'typo')", [appointment])))).toMatch(/Only the project owner/);

      await as(db, aal2(pd.id), () => db.query("select public.void_appointment($1, 'Wrong date')", [appointment]));
      expect(await status(db, await itemId(db, projectId, client.email, "CL-11D-APPOINT-PD"))).toBe("not_started");
      expect(await expectError(sign(db, client.id, appointment, "appointer", "Chris Client"))).toMatch(/not waiting/);
      await prepare(db, pd.id, projectId, "pd_appointment", pdMember);
    }));

  it("shows appointments to project members only", () =>
    inTransaction(async (db) => {
      const { pd, contractor, projectId } = await team(db);
      const stranger = await signUpUser(db, "stranger");
      await prepare(db, pd.id, projectId, "pd_appointment", await memberId(db, projectId, pd.email));
      const sees = async (id: string) =>
        (await as(db, aal2(id), () => db.query("select 1 from public.appointments where project_id = $1", [projectId]))).rowCount;
      expect(await sees(contractor.id)).toBe(1);
      expect(await sees(stranger.id)).toBe(0);
    }));
});

describe("reviewer visibility", () => {
  it("lets the client see everyone's competence items, but no other items, and not other projects'", () =>
    inTransaction(async (db) => {
      const { client, designer, projectId } = await team(db);
      const { rows } = await as(db, aal2(client.id), () =>
        db.query(`select distinct i.template_code from public.checklist_items i
                  join public.project_members m on m.id = i.member_id
                  where i.project_id = $1 and m.user_id is distinct from $2`, [projectId, client.id]));
      expect(rows.map((r) => r.template_code)).toEqual(["ALL-11F-COMPETENCE"]);

      const designersProject = await createProject(db, designer.id);
      const other = await as(db, aal2(client.id), () =>
        db.query("select 1 from public.checklist_items where project_id = $1", [designersProject]));
      expect(other.rowCount).toBe(0);
    }));
});
