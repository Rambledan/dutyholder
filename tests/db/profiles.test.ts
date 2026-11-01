import { afterAll, describe, expect, it } from "vitest";
import { as, expectError, inTransaction, pool, signUpUser } from "./helpers";

afterAll(() => pool?.end());

describe("profiles RLS", () => {
  it("lets a user read their own profile only after 2FA", () =>
    inTransaction(async (db) => {
      const a = await signUpUser(db, "a");

      const full = await as(db, { id: a.id, aal: "aal2" }, () => db.query("select id from public.profiles"));
      expect(full.rows).toEqual([{ id: a.id }]);

      const half = await as(db, { id: a.id, aal: "aal1" }, () => db.query("select id from public.profiles"));
      expect(half.rowCount).toBe(0);
    }));

  it("never shows user A another user's profile", () =>
    inTransaction(async (db) => {
      const a = await signUpUser(db, "a");
      const b = await signUpUser(db, "b");

      const rows = await as(db, { id: a.id, aal: "aal2" }, () =>
        db.query("select id from public.profiles where id = $1", [b.id]),
      );
      expect(rows.rowCount).toBe(0);
    }));

  it("refuses anonymous visitors outright", () =>
    inTransaction(async (db) => {
      await signUpUser(db, "a");
      const msg = await expectError(as(db, "anon", () => db.query("select * from public.profiles")));
      expect(msg).toMatch(/permission denied/);
    }));

  it("lets a user edit their own name after 2FA, and nobody else's", () =>
    inTransaction(async (db) => {
      const a = await signUpUser(db, "a", "Before");
      const b = await signUpUser(db, "b", "Untouched");

      const own = await as(db, { id: a.id, aal: "aal2" }, () =>
        db.query("update public.profiles set full_name = 'After' where id = $1", [a.id]),
      );
      expect(own.rowCount).toBe(1);

      const other = await as(db, { id: a.id, aal: "aal2" }, () =>
        db.query("update public.profiles set full_name = 'Hacked' where id = $1", [b.id]),
      );
      expect(other.rowCount).toBe(0);

      const halfLoggedIn = await as(db, { id: a.id, aal: "aal1" }, () =>
        db.query("update public.profiles set full_name = 'Sneaky' where id = $1", [a.id]),
      );
      expect(halfLoggedIn.rowCount).toBe(0);

      const names = await db.query("select id, full_name from public.profiles where id = any($1)", [[a.id, b.id]]);
      const byId = Object.fromEntries(names.rows.map((r) => [r.id, r.full_name]));
      expect(byId).toEqual({ [a.id]: "After", [b.id]: "Untouched" });

      const audit = await db.query(
        "select count(*)::int as n from public.audit_log where action = 'profile.updated' and entity_id = $1",
        [a.id],
      );
      expect(audit.rows[0].n).toBe(1);
    }));

  it("refuses to let users create, delete or re-key profiles", () =>
    inTransaction(async (db) => {
      const a = await signUpUser(db, "a");
      const me = { id: a.id, aal: "aal2" as const };

      await expectError(as(db, me, () => db.query("insert into public.profiles (id) values (gen_random_uuid())")));
      await expectError(as(db, me, () => db.query("delete from public.profiles where id = $1", [a.id])));
      await expectError(
        as(db, me, () => db.query("update public.profiles set id = gen_random_uuid() where id = $1", [a.id])),
      );
    }));
});

describe("tables with no API access", () => {
  for (const table of ["invites", "mfa_recovery_codes", "audit_log"]) {
    it(`hides ${table} from signed-in users and visitors`, () =>
      inTransaction(async (db) => {
        const a = await signUpUser(db, "a");
        const asUser = await as(db, { id: a.id, aal: "aal2" }, () => db.query(`select * from public.${table}`)).then(
          (r) => r.rowCount,
          () => "denied",
        );
        expect([0, "denied"]).toContain(asUser);
        await expectError(as(db, "anon", () => db.query(`select * from public.${table}`)));
      }));
  }
});

describe("audit_log is append-only", () => {
  it("refuses updates and deletes, even from the database owner", () =>
    inTransaction(async (db) => {
      await signUpUser(db, "a"); // writes an audit entry

      await db.query("savepoint s");
      expect(await expectError(db.query("update public.audit_log set action = 'tampered'"))).toMatch(/append-only/);
      await db.query("rollback to savepoint s");
      expect(await expectError(db.query("delete from public.audit_log"))).toMatch(/append-only/);
      await db.query("rollback to savepoint s");
      expect(await expectError(db.query("truncate public.audit_log"))).toMatch(/append-only/);
      await db.query("rollback to savepoint s");
    }));
});
