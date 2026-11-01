import { afterAll, describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import { addMember, as, createProject, expectError, inTransaction, pool, signUpUser, testEmail } from "./helpers";

afterAll(() => pool?.end());

// Two separate projects: A's (A owns, with a teammate) and B's.
async function twoProjects(db: PoolClient) {
  const a = await signUpUser(db, "a");
  const b = await signUpUser(db, "b");
  const teammate = await signUpUser(db, "teammate");
  const projectA = await createProject(db, a.id);
  const projectB = await createProject(db, b.id);
  await addMember(db, a.id, projectA, teammate.email, "designer");
  await addMember(db, b.id, projectB, testEmail("b-client"), "client");
  return { a, b, teammate, projectA, projectB };
}

const count = (db: PoolClient, sql: string, params: unknown[] = []) =>
  db.query(sql, params).then((r) => r.rowCount);

describe("cross-project isolation", () => {
  it("user A can read nothing at all from user B's project", () =>
    inTransaction(async (db) => {
      const { a, projectB } = await twoProjects(db);
      const asA = { id: a.id, aal: "aal2" as const };

      await as(db, asA, async () => {
        expect(await count(db, "select 1 from public.projects where id = $1", [projectB])).toBe(0);
        expect(await count(db, "select 1 from public.project_members where project_id = $1", [projectB])).toBe(0);
        expect(await count(db, "select 1 from public.checklist_items where project_id = $1", [projectB])).toBe(0);
        expect(await count(db, "select 1 from public.audit_log where project_id = $1", [projectB])).toBe(0);
      });
    }));

  it("user A cannot change or join user B's project", () =>
    inTransaction(async (db) => {
      const { a, projectB } = await twoProjects(db);
      const asA = { id: a.id, aal: "aal2" as const };

      const updated = await as(db, asA, () =>
        db.query("update public.projects set name = 'Hijacked' where id = $1", [projectB]),
      );
      expect(updated.rowCount).toBe(0);

      const msg = await expectError(
        as(db, asA, () => db.query("select public.add_project_member($1, $2, '', 'designer', null, false)", [
          projectB, testEmail("intruder"),
        ])),
      );
      expect(msg).toMatch(/Only the project owner/);
    }));

  it("sees only their own projects in a list", () =>
    inTransaction(async (db) => {
      const { a, projectA } = await twoProjects(db);
      const { rows } = await as(db, { id: a.id, aal: "aal2" }, () => db.query("select id from public.projects"));
      expect(rows.map((r) => r.id)).toEqual([projectA]);
    }));
});

describe("two-factor is required everywhere", () => {
  it("a password-only session sees nothing, even on their own project", () =>
    inTransaction(async (db) => {
      const { a, projectA } = await twoProjects(db);
      await as(db, { id: a.id, aal: "aal1" }, async () => {
        expect(await count(db, "select 1 from public.projects")).toBe(0);
        expect(await count(db, "select 1 from public.project_members")).toBe(0);
        expect(await count(db, "select 1 from public.checklist_items")).toBe(0);
        expect(await count(db, "select 1 from public.duty_templates")).toBe(0);
        expect(await count(db, "select 1 from public.audit_log where project_id = $1", [projectA])).toBe(0);
      });
      await expectError(
        as(db, { id: a.id, aal: "aal1" }, () =>
          db.query("select public.create_project('x', '', '', false, false, false, 2, false, 'client')"),
        ),
      );
    }));

  it("anonymous visitors are refused outright", () =>
    inTransaction(async (db) => {
      await twoProjects(db);
      for (const table of ["projects", "project_members", "duty_templates", "checklist_items"]) {
        const msg = await expectError(as(db, "anon", () => db.query(`select * from public.${table}`)));
        expect(msg).toMatch(/permission denied/);
      }
    }));
});

describe("inside a project", () => {
  it("makes the creator the owner and refuses higher-risk work", () =>
    inTransaction(async (db) => {
      const a = await signUpUser(db, "a");
      const projectId = await createProject(db, a.id);
      const owner = await db.query("select is_owner, user_id from public.project_members where project_id = $1", [projectId]);
      expect(owner.rows).toEqual([{ is_owner: true, user_id: a.id }]);

      const msg = await expectError(
        as(db, { id: a.id, aal: "aal2" }, () =>
          db.query("select public.create_project('Tower', '', '', false, false, true, 2, false, 'client')"),
        ),
      );
      expect(msg).toMatch(/Higher-risk/);
    }));

  it("lets a teammate see the team but only their own checklist items", () =>
    inTransaction(async (db) => {
      const { teammate, projectA } = await twoProjects(db);
      const asTeammate = { id: teammate.id, aal: "aal2" as const };

      await as(db, asTeammate, async () => {
        expect(await count(db, "select 1 from public.projects where id = $1", [projectA])).toBe(1);
        expect(await count(db, "select 1 from public.project_members where project_id = $1", [projectA])).toBe(2);

        const { rows } = await db.query(
          `select distinct m.user_id from public.checklist_items i
           join public.project_members m on m.id = i.member_id`,
        );
        expect(rows).toEqual([{ user_id: teammate.id }]);

        expect(await count(db, "select 1 from public.audit_log")).toBe(0);
      });
    }));

  it("lets teammates see each other's profile, but not strangers'", () =>
    inTransaction(async (db) => {
      const { a, b, teammate } = await twoProjects(db);
      const { rows } = await as(db, { id: teammate.id, aal: "aal2" }, () =>
        db.query("select id from public.profiles where id = any($1) order by id", [[a.id, b.id, teammate.id]]),
      );
      expect(rows.map((r) => r.id).sort()).toEqual([a.id, teammate.id].sort());
    }));

  it("lets the owner see every item and the audit trail", () =>
    inTransaction(async (db) => {
      const { a, teammate, projectA } = await twoProjects(db);
      await as(db, { id: a.id, aal: "aal2" }, async () => {
        const { rows } = await db.query(
          `select distinct m.user_id from public.checklist_items i
           join public.project_members m on m.id = i.member_id where i.project_id = $1`,
          [projectA],
        );
        expect(rows.map((r) => r.user_id).sort()).toEqual([a.id, teammate.id].sort());
        expect(await count(db, "select 1 from public.audit_log where project_id = $1", [projectA])).toBeGreaterThan(0);
      });
    }));

  it("stops a non-owner from changing the project or adding people", () =>
    inTransaction(async (db) => {
      const { teammate, projectA } = await twoProjects(db);
      const asTeammate = { id: teammate.id, aal: "aal2" as const };

      const updated = await as(db, asTeammate, () =>
        db.query("update public.projects set is_domestic_client = true where id = $1", [projectA]),
      );
      expect(updated.rowCount).toBe(0);

      await expectError(
        as(db, asTeammate, () =>
          db.query("select public.add_project_member($1, $2, '', 'contractor', null, false)", [projectA, testEmail("x")]),
        ),
      );
    }));

  it("stops anyone writing checklist items or templates directly", () =>
    inTransaction(async (db) => {
      const { a, projectA } = await twoProjects(db);
      const asOwner = { id: a.id, aal: "aal2" as const };
      await expectError(as(db, asOwner, () => db.query("update public.checklist_items set status = 'complete'")));
      await expectError(as(db, asOwner, () => db.query("delete from public.checklist_items where project_id = $1", [projectA])));
      await expectError(as(db, asOwner, () => db.query("update public.duty_templates set title = 'x'")));
      await expectError(
        as(db, asOwner, () => db.query("update public.project_members set is_owner = true where project_id = $1", [projectA])),
      );
    }));

  it("links a pending member when they sign up later", () =>
    inTransaction(async (db) => {
      const a = await signUpUser(db, "a");
      const projectId = await createProject(db, a.id);
      const laterEmail = testEmail("later");
      await addMember(db, a.id, projectId, laterEmail, "designer");

      const pending = await db.query("select user_id from public.project_members where email = $1", [laterEmail]);
      expect(pending.rows[0].user_id).toBeNull();

      const { rows: [{ token }] } = await db.query("select public.create_invite($1) as token", [laterEmail]);
      const { rows: [{ id }] } = await db.query(
        `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data,
           raw_app_meta_data, email_confirmed_at, created_at, updated_at)
         values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           $1, '', $2, '{}', now(), now(), now()) returning id`,
        [laterEmail, JSON.stringify({ invite_token: token })],
      );
      const linked = await db.query("select user_id from public.project_members where email = $1", [laterEmail]);
      expect(linked.rows[0].user_id).toBe(id);
    }));
});
