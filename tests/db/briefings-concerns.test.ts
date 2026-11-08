// Phase 9: role briefings, concerns (11K(4), 11L(4), 11M(4), 11N(4)) and
// replacement reviews (11M(6), 11N(6)).
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
  const designer2 = await signUpUser(db, "designer2", "Fay Fire");
  const pc = await signUpUser(db, "pc", "Bea Builder");
  const contractor = await signUpUser(db, "contractor", "Eddie Electric");
  const projectId = await createProject(db, pd.id, opts);
  await addMember(db, pd.id, projectId, client.email, "client");
  await addMember(db, pd.id, projectId, designer.email, "designer");
  await addMember(db, pd.id, projectId, designer2.email, "designer");
  await addMember(db, pd.id, projectId, pc.email, opts.expectedContractors === 1 ? "contractor" : "principal_contractor");
  if (opts.expectedContractors !== 1) await addMember(db, pd.id, projectId, contractor.email, "contractor");
  return { pd, client, designer, designer2, pc, contractor, projectId };
}

const raise = (db: PoolClient, userId: string, projectId: string, kind: string, subject = "Steel to timber junction", body = "The connection detail doesn't match the fire strategy.") =>
  as(db, aal2(userId), () => db.query("select public.raise_concern($1, $2, $3, $4) as id", [projectId, kind, subject, body]))
    .then((r) => r.rows[0].id as string);

const respond = (db: PoolClient, userId: string, concernId: string, body = "Agreed; revised detail issued as rev C.") =>
  as(db, aal2(userId), () => db.query("select public.respond_to_concern($1, $2) as id", [concernId, body]));

const canSee = async (db: PoolClient, userId: string, concernId: string) =>
  (await as(db, aal2(userId), () => db.query("select 1 from public.concerns where id = $1", [concernId]))).rowCount === 1;

describe("role briefings", () => {
  it("gives every role its briefing as the first task, and signing records the statutory text", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const codes = await activeCodesByEmail(db, t.projectId);
      expect(codes[t.client.email]).toContain("BRF-CL");
      expect(codes[t.pd.email]).toContain("BRF-PD");
      expect(codes[t.designer.email]).toContain("BRF-DES");
      expect(codes[t.pc.email]).toContain("BRF-PC");
      expect(codes[t.contractor.email]).toContain("BRF-CON");

      const { rows: [first] } = await db.query(
        `select i.template_code from public.checklist_items i join public.duty_templates d on d.id = i.template_id
         join public.project_members m on m.id = i.member_id
         where m.email = $1 and i.project_id = $2 and i.withdrawn_at is null order by d.sort_order limit 1`,
        [t.pd.email, t.projectId]);
      expect(first.template_code).toBe("BRF-PD");

      const item = await itemId(db, t.projectId, t.pd.email, "BRF-PD");
      await as(db, aal2(t.pd.id), () => db.query("select public.sign_acknowledgement($1, 'Pat Designer')", [item]));
      const { rows: [sig] } = await db.query("select statement from public.signatures where checklist_item_id = $1", [item]);
      expect(sig.statement).toMatch(/I have read and understood my duties as principal designer .* \(role briefing BRF-PD v1\)/);
      expect(sig.statement).toContain("Where a replacement principal designer is appointed, they must review the arrangements");
      expect(sig.statement).toMatch(/\[Briefing text SHA-256 [0-9a-f]{64}\]$/);
    }));

  it("can be read after two-factor only, and never edited", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const ok = await as(db, aal2(t.designer.id), () => db.query("select 1 from public.role_briefings"));
      expect(ok.rowCount).toBe(5);
      const half = await as(db, { id: t.designer.id, aal: "aal1" }, () => db.query("select 1 from public.role_briefings"));
      expect(half.rowCount).toBe(0);
      expect(await expectError(db.query("update public.role_briefings set intro = 'x' where template_code = 'BRF-PD'")))
        .toMatch(/never edited/);
    }));
});

describe("concerns", () => {
  it("sends a designer's concern to the principal designer, who records a response", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const concern = await raise(db, t.designer.id, t.projectId, "design_concern");

      // Visible to the raiser, the principals and the owner; not to others.
      expect(await canSee(db, t.designer.id, concern)).toBe(true);
      expect(await canSee(db, t.pd.id, concern)).toBe(true);
      expect(await canSee(db, t.pc.id, concern)).toBe(true);
      expect(await canSee(db, t.designer2.id, concern)).toBe(false);
      expect(await canSee(db, t.client.id, concern)).toBe(false);
      expect(await canSee(db, t.contractor.id, concern)).toBe(false);

      // Only the principal designer (or owner) responds.
      expect(await expectError(respond(db, t.designer2.id, concern))).toMatch(/Only the principal designer/);
      expect(await expectError(respond(db, t.pc.id, concern))).toMatch(/Only the principal designer/);
      await respond(db, t.pd.id, concern);
      const seen = await as(db, aal2(t.designer.id), () =>
        db.query("select body from public.concern_responses where concern_id = $1", [concern]));
      expect(seen.rows[0].body).toMatch(/revised detail/);
      const hidden = await as(db, aal2(t.designer2.id), () =>
        db.query("select 1 from public.concern_responses where concern_id = $1", [concern]));
      expect(hidden.rowCount).toBe(0);

      const { rows } = await db.query(
        "select action from public.audit_log where entity_id = $1 order by occurred_at", [concern]);
      expect(rows.map((r) => r.action)).toEqual(["concern.raised", "concern.responded"]);
      expect(await expectError(db.query("delete from public.concerns where id = $1", [concern]))).toMatch(/append-only/);
    }));

  it("only lets each role raise its own kind", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      expect(await expectError(raise(db, t.contractor.id, t.projectId, "design_concern"))).toMatch(/can't raise/);
      expect(await expectError(raise(db, t.designer.id, t.projectId, "building_concern"))).toMatch(/can't raise/);
      expect(await expectError(raise(db, t.client.id, t.projectId, "pc_comment"))).toMatch(/can't raise/);
      expect(await expectError(raise(db, t.designer.id, t.projectId, "design_concern", " ", " "))).toMatch(/subject/);
      // Without two-factor, nothing.
      expect(await expectError(as(db, { id: t.designer.id, aal: "aal1" }, () =>
        db.query("select public.raise_concern($1, 'design_concern', 's', 'b')", [t.projectId])))).toMatch(/Two-factor/);
    }));

  it("routes contractors to the principal contractor, and the principals' comments to each other", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const building = await raise(db, t.contractor.id, t.projectId, "building_concern");
      expect(await expectError(respond(db, t.designer.id, building))).toMatch(/Only the principal contractor/);
      await respond(db, t.pc.id, building);

      const pcComment = await raise(db, t.pc.id, t.projectId, "pc_comment");
      await respond(db, t.pd.id, pcComment);
      const pdComment = await raise(db, t.pd.id, t.projectId, "pd_comment");
      await respond(db, t.pc.id, pdComment);
    }));

  it("treats a sole contractor as the principal contractor", () =>
    inTransaction(async (db) => {
      const t = await team(db, { expectedContractors: 1 });
      expect(await expectError(raise(db, t.pc.id, t.projectId, "building_concern"))).toMatch(/can't raise/);
      const comment = await raise(db, t.pc.id, t.projectId, "pc_comment");
      await respond(db, t.pd.id, comment);
    }));
});

describe("replacement reviews (11M(6))", () => {
  it("gives a replacement principal designer a review task with the previous handover", () =>
    inTransaction(async (db) => {
      const t = await team(db);
      const pdMember = (await db.query("select id from public.project_members where project_id = $1 and email = $2",
        [t.projectId, t.pd.email])).rows[0].id;

      // The first principal designer writes a handover, then leaves.
      const handover = await itemId(db, t.projectId, t.pd.email, "PD-11M-HANDOVER");
      await as(db, aal2(t.pd.id), () => db.query("select public.save_item_answer($1, 'Weekly design reviews; tracker kept.')", [handover]));
      await as(db, aal2(t.pd.id), () => db.query(
        "update public.project_members set appointment_ended_on = current_date - 1 where id = $1", [pdMember]));

      const pd2 = await signUpUser(db, "pd2", "Rae Replacement");
      await addMember(db, t.pd.id, t.projectId, pd2.email, "principal_designer");
      const codes = await activeCodesByEmail(db, t.projectId);
      expect(codes[pd2.email]).toContain("PD-11M-REVIEW");
      expect(codes[t.pd.email]).not.toContain("PD-11M-REVIEW");

      const review = await itemId(db, t.projectId, pd2.email, "PD-11M-REVIEW");
      const { rows } = await as(db, aal2(pd2.id), () => db.query("select * from public.previous_handovers($1)", [review]));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ name: "Pat Designer", handover_text: "Weekly design reviews; tracker kept." });

      expect(await expectError(as(db, aal2(t.designer.id), () =>
        db.query("select * from public.previous_handovers($1)", [review])))).toMatch(/not yours/);
    }));
});
