import { afterAll, describe, expect, it } from "vitest";
import { addMember, as, createProject, expectError, inTransaction, itemId, pool, signUpUser } from "./helpers";

afterAll(() => pool?.end());

const aal2 = (id: string) => ({ id, aal: "aal2" as const });

describe("one login, many partners", () => {
  it("doesn't attach an existing account until the person accepts", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner", "Olivia Owner");
      const sam = await signUpUser(db, "sam", "Sam Structures");
      const projectId = await createProject(db, owner.id);
      const memberId = await addMember(db, owner.id, projectId, sam.email, "designer", false, false);

      // The owner can't see Sam's profile, and Sam can't see the project.
      const ownerSeesSam = await as(db, aal2(owner.id), () => db.query("select 1 from public.profiles where id = $1", [sam.id]));
      expect(ownerSeesSam.rowCount).toBe(0);
      const samSeesProject = await as(db, aal2(sam.id), () => db.query("select 1 from public.projects where id = $1", [projectId]));
      expect(samSeesProject.rowCount).toBe(0);

      // The invitation tells Sam who it's from, but nothing else.
      const { rows: invites } = await as(db, aal2(sam.id), () => db.query("select * from public.my_invitations()"));
      expect(invites).toHaveLength(1);
      expect(invites[0]).toMatchObject({ project_id: projectId, owner_name: "Olivia Owner", role: "designer" });

      // Inviting someone with an account sends no sign-up link.
      const { rows: [inv] } = await as(db, aal2(owner.id), () => db.query("select * from public.invite_project_member($1)", [memberId]));
      expect(inv).toMatchObject({ token: null, existing_account: true });

      await as(db, aal2(sam.id), () => db.query("select public.accept_invitation($1)", [memberId]));
      expect((await as(db, aal2(owner.id), () => db.query("select 1 from public.profiles where id = $1", [sam.id]))).rowCount).toBe(1);
      expect((await as(db, aal2(sam.id), () => db.query("select * from public.my_invitations()"))).rowCount).toBe(0);
      const { rows: partners } = await as(db, aal2(sam.id), () => db.query("select * from public.my_partners()"));
      expect(partners).toEqual([expect.objectContaining({ project_id: projectId, owner_name: "Olivia Owner", my_roles: ["designer"] })]);
    }));

  it("lets people decline, and only ever see invitations to their own email", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const sam = await signUpUser(db, "sam");
      const nosy = await signUpUser(db, "nosy");
      const projectId = await createProject(db, owner.id);
      const memberId = await addMember(db, owner.id, projectId, sam.email, "designer", false, false);

      expect((await as(db, aal2(nosy.id), () => db.query("select * from public.my_invitations()"))).rowCount).toBe(0);
      expect(await expectError(as(db, aal2(nosy.id), () => db.query("select public.accept_invitation($1)", [memberId]))))
        .toMatch(/not found/);

      await as(db, aal2(sam.id), () => db.query("select public.decline_invitation($1)", [memberId]));
      const { rows: [m] } = await db.query("select user_id, declined_at from public.project_members where id = $1", [memberId]);
      expect(m.user_id).toBeNull();
      expect(m.declined_at).not.toBeNull();
      expect((await as(db, aal2(sam.id), () => db.query("select * from public.my_invitations()"))).rowCount).toBe(0);
    }));

  it("doesn't chase people who haven't accepted", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const sam = await signUpUser(db, "sam");
      const projectId = await createProject(db, owner.id);
      await addMember(db, owner.id, projectId, sam.email, "designer", false, false);
      const { rows: [{ s }] } = await db.query("select public.chase_state() as s");
      expect(s.members.some((m: { email: string }) => m.email === sam.email)).toBe(false);
    }));

  it("saves profile details and a competence passport, reusable on any project", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const sam = await signUpUser(db, "sam");
      const me = aal2(sam.id);
      await as(db, me, () => db.query(
        "update public.profiles set company = 'Structures Ltd', job_title = 'Associate', memberships = 'CEng MIStructE' where id = $1", [sam.id]));

      await as(db, me, () => db.query("select public.start_competence_draft()"));
      expect(await expectError(as(db, me, () => db.query("select public.submit_competence_passport()")))).toMatch(/every question/);
      await as(db, me, () => db.query(`update public.competence_statements set skills='s', knowledge='k', experience='e',
        behaviour_compliance='c', behaviour_cooperation='co', behaviour_limits='l' where user_id = $1`, [sam.id]));
      await as(db, me, () => db.query("select public.submit_competence_passport()"));

      // A later project reuses the saved statement with one step.
      const projectId = await createProject(db, owner.id);
      await addMember(db, owner.id, projectId, sam.email, "designer");
      const item = await itemId(db, projectId, sam.email, "ALL-11F-COMPETENCE");
      await as(db, me, () => db.query("select public.submit_competence($1)", [item]));
      const { rows: [r] } = await db.query(
        "select i.status, s.version from public.checklist_items i join public.competence_statements s on s.id = i.competence_statement_id where i.id = $1", [item]);
      expect(r).toEqual({ status: "submitted", version: 1 });

      const { rows: [p] } = await as(db, aal2(owner.id), () =>
        db.query("select company, job_title, memberships from public.profiles where id = $1", [sam.id]));
      expect(p).toEqual({ company: "Structures Ltd", job_title: "Associate", memberships: "CEng MIStructE" });
    }));
});
