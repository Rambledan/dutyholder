import { afterAll, describe, expect, it } from "vitest";
import { addMember, as, createProject, expectError, inTransaction, pool, signUpUser } from "./helpers";

afterAll(() => pool?.end());

const aal2 = (id: string) => ({ id, aal: "aal2" as const });

describe("evidence pack exports", () => {
  it("lets only the owner request a pack, one at a time", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const member = await signUpUser(db, "member");
      const projectId = await createProject(db, owner.id);
      await addMember(db, owner.id, projectId, member.email, "designer");

      expect(await expectError(as(db, aal2(member.id), () => db.query("select public.request_export($1)", [projectId]))))
        .toMatch(/Only the project owner/);
      await as(db, aal2(owner.id), () => db.query("select public.request_export($1)", [projectId]));
      expect(await expectError(as(db, aal2(owner.id), () => db.query("select public.request_export($1)", [projectId]))))
        .toMatch(/already being built/);
    }));

  it("shows packs and their files to the owner only, and only until they expire", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const member = await signUpUser(db, "member");
      const projectId = await createProject(db, owner.id);
      await addMember(db, owner.id, projectId, member.email, "designer");
      const { rows: [{ id }] } = await as(db, aal2(owner.id), () => db.query("select public.request_export($1) as id", [projectId]));

      const path = `${projectId}/${id}.zip`;
      await db.query("insert into storage.objects (bucket_id, name) values ('exports', $1)", [path]);
      await db.query("select public.finish_export($1, 'ready', $2, 'pack.zip', 10, $3, 5, 0, null)", [id, path, "d".repeat(64)]);

      const sees = async (userId: string) => ({
        row: (await as(db, aal2(userId), () => db.query("select 1 from public.exports where id = $1", [id]))).rowCount,
        file: (await as(db, aal2(userId), () => db.query("select 1 from storage.objects where name = $1", [path]))).rowCount,
      });
      expect(await sees(owner.id)).toEqual({ row: 1, file: 1 });
      expect(await sees(member.id)).toEqual({ row: 0, file: 0 });

      await as(db, aal2(owner.id), () => db.query("select public.record_export_download($1)", [id]));
      const logged = await db.query("select 1 from public.audit_log where action = 'export.downloaded' and entity_id = $1", [id]);
      expect(logged.rowCount).toBe(1);

      // 25 hours later the file can't be opened and downloads are refused.
      await db.query("update public.exports set expires_at = now() - interval '1 hour' where id = $1", [id]);
      expect((await sees(owner.id)).file).toBe(0);
      expect(await expectError(as(db, aal2(owner.id), () => db.query("select public.record_export_download($1)", [id]))))
        .toMatch(/expired/);
    }));

  it("keeps the export job's function away from signed-in users", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const projectId = await createProject(db, owner.id);
      const { rows: [{ id }] } = await as(db, aal2(owner.id), () => db.query("select public.request_export($1) as id", [projectId]));
      expect(await expectError(as(db, aal2(owner.id), () =>
        db.query("select public.finish_export($1, 'ready', 'x', 'x', 1, 'x', 1, 0, null)", [id])))).toMatch(/permission denied/);
    }));
});
