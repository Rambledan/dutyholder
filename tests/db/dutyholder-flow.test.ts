import { afterAll, describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import {
  FAKE_SHA, addMember, as, createProject, expectError, inTransaction, itemId, pool, signUpUser, uploadObject,
} from "./helpers";

afterAll(() => pool?.end());

// Owner (principal designer) plus a signed-up client and designer.
async function team(db: PoolClient) {
  const owner = await signUpUser(db, "owner", "Olivia Owner");
  const client = await signUpUser(db, "client", "Chris Client");
  const designer = await signUpUser(db, "designer", "Dee Designer");
  const projectId = await createProject(db, owner.id);
  await addMember(db, owner.id, projectId, client.email, "client");
  await addMember(db, owner.id, projectId, designer.email, "designer");
  return { owner, client, designer, projectId };
}

const aal2 = (id: string) => ({ id, aal: "aal2" as const });

describe("signing an acknowledgement", () => {
  it("records the typed name and a fingerprint of the wording, and completes the item", () =>
    inTransaction(async (db) => {
      const { designer, projectId } = await team(db);
      const item = await itemId(db, projectId, designer.email, "DES-11K-DESIGNER");

      await as(db, aal2(designer.id), () =>
        db.query("select public.sign_acknowledgement($1, ' dee  DESIGNER ', 'test-agent')", [item]),
      );

      const { rows: [sig] } = await db.query("select * from public.signatures where checklist_item_id = $1", [item]);
      expect(sig.typed_name).toBe("dee  DESIGNER");
      expect(sig.statement).toContain("Reg 11K");
      expect(sig.statement_sha256).toMatch(/^[0-9a-f]{64}$/);
      const { rows: [it] } = await db.query("select status, completed_at from public.checklist_items where id = $1", [item]);
      expect(it.status).toBe("complete");
      expect(it.completed_at).not.toBeNull();
    }));

  it("refuses a name that doesn't match the account, a second signature, and a half-logged-in session", () =>
    inTransaction(async (db) => {
      const { designer, projectId } = await team(db);
      const item = await itemId(db, projectId, designer.email, "DES-11K-DESIGNER");

      expect(await expectError(as(db, aal2(designer.id), () =>
        db.query("select public.sign_acknowledgement($1, 'Someone Else')", [item])))).toMatch(/exactly as it appears/);
      await expectError(as(db, { id: designer.id, aal: "aal1" }, () =>
        db.query("select public.sign_acknowledgement($1, 'Dee Designer')", [item])));

      await as(db, aal2(designer.id), () => db.query("select public.sign_acknowledgement($1, 'Dee Designer')", [item]));
      expect(await expectError(as(db, aal2(designer.id), () =>
        db.query("select public.sign_acknowledgement($1, 'Dee Designer')", [item])))).toMatch(/already signed/);
    }));

  it("won't let anyone sign someone else's item, or sign a non-acknowledgement", () =>
    inTransaction(async (db) => {
      const { owner, designer, projectId } = await team(db);
      const designersItem = await itemId(db, projectId, designer.email, "DES-11K-DESIGNER");
      expect(await expectError(as(db, aal2(owner.id), () =>
        db.query("select public.sign_acknowledgement($1, 'Olivia Owner')", [designersItem])))).toMatch(/not yours/);

      const form = await itemId(db, projectId, designer.email, "ALL-11F-COMPETENCE");
      expect(await expectError(as(db, aal2(designer.id), () =>
        db.query("select public.sign_acknowledgement($1, 'Dee Designer')", [form])))).toMatch(/not an acknowledgement/);
    }));

  it("keeps signatures unchangeable and visible only to the signer and the owner", () =>
    inTransaction(async (db) => {
      const { owner, client, designer, projectId } = await team(db);
      const item = await itemId(db, projectId, designer.email, "DES-11K-DESIGNER");
      await as(db, aal2(designer.id), () => db.query("select public.sign_acknowledgement($1, 'Dee Designer')", [item]));

      await db.query("savepoint s");
      expect(await expectError(db.query("update public.signatures set typed_name = 'x'"))).toMatch(/append-only/);
      await db.query("rollback to savepoint s");

      const seen = async (id: string) =>
        (await as(db, aal2(id), () => db.query("select 1 from public.signatures where checklist_item_id = $1", [item]))).rowCount;
      expect(await seen(designer.id)).toBe(1);
      expect(await seen(owner.id)).toBe(1);
      expect(await seen(client.id)).toBe(0);
    }));
});

describe("simple form items", () => {
  it("autosaves an answer, then completes only when filled in", () =>
    inTransaction(async (db) => {
      const { client, projectId } = await team(db);
      const item = await itemId(db, projectId, client.email, "CL-11A-PROGRAMME");
      const me = aal2(client.id);

      expect(await expectError(as(db, me, () => db.query("select public.complete_form_item($1)", [item])))).toMatch(/Fill in/);
      await as(db, me, () => db.query("select public.save_item_answer($1, 'Design 8 weeks, build 20 weeks')", [item]));
      let { rows: [row] } = await db.query("select status, answer from public.checklist_items where id = $1", [item]);
      expect(row.status).toBe("in_progress");
      expect(row.answer.text).toBe("Design 8 weeks, build 20 weeks");

      await as(db, me, () => db.query("select public.complete_form_item($1)", [item]));
      ({ rows: [row] } = await db.query("select status from public.checklist_items where id = $1", [item]));
      expect(row.status).toBe("complete");
      await expectError(as(db, me, () => db.query("select public.save_item_answer($1, 'changed')", [item])));
    }));
});

describe("competence statements", () => {
  const fill = (db: PoolClient, userId: string) =>
    as(db, aal2(userId), () =>
      db.query(`update public.competence_statements set skills = 'CEng', knowledge = 'Eurocodes',
                experience = '20 years', behaviour_compliance = 'I refuse', behaviour_cooperation = 'I share',
                behaviour_limits = 'I decline' where user_id = $1`, [userId]),
    );

  it("autosaves a draft, refuses an incomplete submission, then freezes it on submit", () =>
    inTransaction(async (db) => {
      const { designer, projectId } = await team(db);
      const item = await itemId(db, projectId, designer.email, "ALL-11F-COMPETENCE");
      const me = aal2(designer.id);

      await as(db, me, () => db.query("select public.start_competence_draft()"));
      await as(db, me, () => db.query("update public.competence_statements set skills = 'CEng' where user_id = $1", [designer.id]));
      expect(await expectError(as(db, me, () => db.query("select public.submit_competence($1)", [item])))).toMatch(/every question/);

      await fill(db, designer.id);
      await as(db, me, () => db.query("select public.submit_competence($1)", [item]));

      const { rows: [s] } = await db.query("select status, content_sha256 from public.competence_statements where user_id = $1", [designer.id]);
      expect(s.status).toBe("submitted");
      expect(s.content_sha256).toMatch(/^[0-9a-f]{64}$/);
      const { rows: [i] } = await db.query("select status, competence_statement_id from public.checklist_items where id = $1", [item]);
      expect(i.status).toBe("submitted");
      expect(i.competence_statement_id).not.toBeNull();

      const edit = await as(db, me, () =>
        db.query("update public.competence_statements set skills = 'changed' where user_id = $1", [designer.id]));
      expect(edit.rowCount).toBe(0);
      await db.query("savepoint s");
      expect(await expectError(db.query("update public.competence_statements set skills = 'x' where user_id = $1", [designer.id])))
        .toMatch(/cannot be changed/);
      await db.query("rollback to savepoint s");
    }));

  it("asks a firm for its organisational capability", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const firm = await signUpUser(db, "firm", "Firm Person");
      const projectId = await createProject(db, owner.id);
      await addMember(db, owner.id, projectId, firm.email, "contractor", true);
      const item = await itemId(db, projectId, firm.email, "ALL-11F-COMPETENCE");
      await as(db, aal2(firm.id), () => db.query("select public.start_competence_draft()"));
      await fill(db, firm.id);
      expect(await expectError(as(db, aal2(firm.id), () => db.query("select public.submit_competence($1)", [item]))))
        .toMatch(/organisational capability/);
    }));

  it("shows a submitted statement to that project's reviewers (owner and client) only, and never a draft", () =>
    inTransaction(async (db) => {
      const { owner, client, designer, projectId } = await team(db);
      const stranger = await signUpUser(db, "stranger");
      await createProject(db, stranger.id);
      const item = await itemId(db, projectId, designer.email, "ALL-11F-COMPETENCE");

      await as(db, aal2(designer.id), () => db.query("select public.start_competence_draft()"));
      await fill(db, designer.id);
      const visibleTo = async (id: string) =>
        (await as(db, aal2(id), () =>
          db.query("select 1 from public.competence_statements where user_id = $1", [designer.id]))).rowCount;

      expect(await visibleTo(owner.id)).toBe(0); // draft
      await as(db, aal2(designer.id), () => db.query("select public.submit_competence($1)", [item]));
      expect(await visibleTo(designer.id)).toBe(1);
      expect(await visibleTo(owner.id)).toBe(1);
      // Phase 4: the client reviews competence, so can read it once submitted.
      expect(await visibleTo(client.id)).toBe(1);
      expect(await visibleTo(stranger.id)).toBe(0);
    }));

  it("reuses the latest submitted statement on a second project, and versions new edits", () =>
    inTransaction(async (db) => {
      const { owner, designer, projectId } = await team(db);
      const first = await itemId(db, projectId, designer.email, "ALL-11F-COMPETENCE");
      await as(db, aal2(designer.id), () => db.query("select public.start_competence_draft()"));
      await fill(db, designer.id);
      await as(db, aal2(designer.id), () => db.query("select public.submit_competence($1)", [first]));

      const project2 = await createProject(db, owner.id);
      await addMember(db, owner.id, project2, designer.email, "designer");
      const second = await itemId(db, project2, designer.email, "ALL-11F-COMPETENCE");
      await as(db, aal2(designer.id), () => db.query("select public.submit_competence($1)", [second]));
      const { rows } = await db.query(
        "select competence_statement_id from public.checklist_items where id = any($1)", [[first, second]]);
      expect(new Set(rows.map((r) => r.competence_statement_id)).size).toBe(1);

      await as(db, aal2(designer.id), () => db.query("select public.start_competence_draft()"));
      const { rows: versions } = await db.query(
        "select version, status, skills from public.competence_statements where user_id = $1 order by version", [designer.id]);
      expect(versions).toEqual([
        { version: 1, status: "submitted", skills: "CEng" },
        { version: 2, status: "draft", skills: "CEng" },
      ]);
    }));
});

describe("uploads", () => {
  it("only lets you upload into your own storage folder", () =>
    inTransaction(async (db) => {
      const { client, designer } = await team(db);
      await uploadObject(db, designer.id);
      await expectError(as(db, aal2(designer.id), () =>
        db.query("insert into storage.objects (bucket_id, name, owner_id) values ('evidence', $1, $2)",
          [`${client.id}/sneaky.pdf`, designer.id])));
      await expectError(as(db, { id: designer.id, aal: "aal1" }, () =>
        db.query("insert into storage.objects (bucket_id, name, owner_id) values ('evidence', $1, $2)",
          [`${designer.id}/half.pdf`, designer.id])));
    }));

  it("registers evidence against the draft and shows it to reviewers only after submission", () =>
    inTransaction(async (db) => {
      const { owner, client, designer, projectId } = await team(db);
      const path = await uploadObject(db, designer.id);
      await as(db, aal2(designer.id), () =>
        db.query("select public.register_document($1, 'cert.pdf', 'application/pdf', 1234, $2)", [path, FAKE_SHA]));

      const ownerSees = async (id: string) => ({
        doc: (await as(db, aal2(id), () => db.query("select 1 from public.documents where storage_path = $1", [path]))).rowCount,
        file: (await as(db, aal2(id), () => db.query("select 1 from storage.objects where name = $1", [path]))).rowCount,
      });
      expect(await ownerSees(designer.id)).toEqual({ doc: 1, file: 1 });
      expect(await ownerSees(owner.id)).toEqual({ doc: 0, file: 0 });
      expect(await ownerSees(client.id)).toEqual({ doc: 0, file: 0 });

      await as(db, aal2(designer.id), () =>
        db.query(`update public.competence_statements set skills = 'a', knowledge = 'b', experience = 'c',
          behaviour_compliance = 'd', behaviour_cooperation = 'e', behaviour_limits = 'f' where user_id = $1`, [designer.id]));
      const item = await itemId(db, projectId, designer.email, "ALL-11F-COMPETENCE");
      await as(db, aal2(designer.id), () => db.query("select public.submit_competence($1)", [item]));

      expect(await ownerSees(owner.id)).toEqual({ doc: 1, file: 1 });
      // Phase 4: the client reviews competence, so can open the evidence too.
      expect(await ownerSees(client.id)).toEqual({ doc: 1, file: 1 });
      const stranger = await signUpUser(db, "stranger");
      expect(await ownerSees(stranger.id)).toEqual({ doc: 0, file: 0 });
    }));

  it("refuses to register someone else's file or one that wasn't uploaded", () =>
    inTransaction(async (db) => {
      const { client, designer } = await team(db);
      const clientsPath = await uploadObject(db, client.id);
      expect(await expectError(as(db, aal2(designer.id), () =>
        db.query("select public.register_document($1, 'x.pdf', 'application/pdf', 1, $2)", [clientsPath, FAKE_SHA]))))
        .toMatch(/own folder/);
      expect(await expectError(as(db, aal2(designer.id), () =>
        db.query("select public.register_document($1, 'x.pdf', 'application/pdf', 1, $2)",
          [`${designer.id}/never-uploaded.pdf`, FAKE_SHA])))).toMatch(/not found/);
    }));

  it("shares building information with the team and completes the upload item", () =>
    inTransaction(async (db) => {
      const { client, designer, projectId } = await team(db);
      const stranger = await signUpUser(db, "stranger");
      const item = await itemId(db, projectId, client.email, "CL-11A-INFO");

      expect(await expectError(as(db, aal2(client.id), () => db.query("select public.complete_upload_item($1)", [item]))))
        .toMatch(/at least one file/);
      const path = await uploadObject(db, client.id, "site-survey.pdf");
      await as(db, aal2(client.id), () =>
        db.query("select public.register_document($1, 'site-survey.pdf', 'application/pdf', 99, $2, $3)", [path, FAKE_SHA, item]));

      const canRead = async (id: string) =>
        (await as(db, aal2(id), () => db.query("select 1 from storage.objects where name = $1", [path]))).rowCount;
      expect(await canRead(designer.id)).toBe(1);
      expect(await canRead(stranger.id)).toBe(0);

      await as(db, aal2(client.id), () => db.query("select public.complete_upload_item($1)", [item]));
      const { rows: [row] } = await db.query("select status from public.checklist_items where id = $1", [item]);
      expect(row.status).toBe("complete");
    }));

  it("withdraws files with a reason instead of deleting them", () =>
    inTransaction(async (db) => {
      const { designer } = await team(db);
      const path = await uploadObject(db, designer.id);
      const { rows: [{ id }] } = await as(db, aal2(designer.id), () =>
        db.query("select public.register_document($1, 'old.pdf', 'application/pdf', 5, $2) as id", [path, FAKE_SHA]));

      expect(await expectError(as(db, aal2(designer.id), () => db.query("select public.withdraw_document($1, ' ')", [id]))))
        .toMatch(/reason/);
      await as(db, aal2(designer.id), () => db.query("select public.withdraw_document($1, 'Expired certificate')", [id]));

      const { rows: [doc] } = await db.query("select withdrawn_reason from public.documents where id = $1", [id]);
      expect(doc.withdrawn_reason).toBe("Expired certificate");
      const links = await db.query("select 1 from public.competence_evidence where document_id = $1", [id]);
      expect(links.rowCount).toBe(0);

      await db.query("savepoint s");
      expect(await expectError(db.query("delete from public.documents where id = $1", [id]))).toMatch(/append-only/);
      await db.query("rollback to savepoint s");
      // Supabase refuses SQL deletes of stored files outright; through the
      // Storage API there is no delete policy, so that is refused too.
      await expectError(as(db, aal2(designer.id), () => db.query("delete from storage.objects where name = $1", [path])));
    }));
});

describe("invites from the project page", () => {
  it("gives the owner a working single-use link and cancels the previous one", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const projectId = await createProject(db, owner.id);
      const memberId = await addMember(db, owner.id, projectId, "new-person@example.test", "designer");

      const invite = async () =>
        (await as(db, aal2(owner.id), () => db.query("select * from public.invite_project_member($1)", [memberId]))).rows[0];
      const first = await invite();
      expect(first.email).toBe("new-person@example.test");
      const second = await invite();

      const check = async (token: string) =>
        (await as(db, "anon", () => db.query("select public.check_invite($1) as email", [token]))).rows[0].email;
      expect(await check(first.token)).toBeNull();
      expect(await check(second.token)).toBe("new-person@example.test");
    }));

  it("refuses non-owners and people who have already joined", () =>
    inTransaction(async (db) => {
      const { owner, client, projectId } = await team(db);
      const pending = await addMember(db, owner.id, projectId, "pending@example.test", "contractor");
      expect(await expectError(as(db, aal2(client.id), () =>
        db.query("select * from public.invite_project_member($1)", [pending])))).toMatch(/Only the project owner/);

      const { rows: [{ id: joined }] } = await db.query(
        "select id from public.project_members where project_id = $1 and email = $2", [projectId, client.email]);
      expect(await expectError(as(db, aal2(owner.id), () =>
        db.query("select * from public.invite_project_member($1)", [joined])))).toMatch(/already joined/);
    }));
});
