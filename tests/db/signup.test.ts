import { afterAll, describe, expect, it } from "vitest";
import { as, createInvite, expectError, inTransaction, insertAuthUser, pool, testEmail } from "./helpers";

afterAll(() => pool?.end());

describe("invite-only sign-up", () => {
  it("refuses a sign-up with no invite", () =>
    inTransaction(async (db) => {
      const msg = await expectError(insertAuthUser(db, testEmail("noinvite"), {}));
      expect(msg).toMatch(/requires an invite/);
    }));

  it("refuses a made-up invite token", () =>
    inTransaction(async (db) => {
      const msg = await expectError(insertAuthUser(db, testEmail("fake"), { invite_token: "not-a-real-token" }));
      expect(msg).toMatch(/invalid, expired or already used/);
    }));

  it("refuses an invite meant for a different email address", () =>
    inTransaction(async (db) => {
      const token = await createInvite(db, testEmail("intended"));
      const msg = await expectError(insertAuthUser(db, testEmail("someone-else"), { invite_token: token }));
      expect(msg).toMatch(/invalid, expired or already used/);
    }));

  it("refuses an expired invite", () =>
    inTransaction(async (db) => {
      const email = testEmail("expired");
      const token = await createInvite(db, email);
      await db.query("update public.invites set expires_at = now() - interval '1 second' where email = $1", [email]);
      const msg = await expectError(insertAuthUser(db, email, { invite_token: token }));
      expect(msg).toMatch(/invalid, expired or already used/);
    }));

  it("lets an invite be used only once", () =>
    inTransaction(async (db) => {
      const email = testEmail("once");
      const token = await createInvite(db, email);
      await insertAuthUser(db, email, { invite_token: token });
      await db.query("delete from auth.users where email = $1", [email]);
      const msg = await expectError(insertAuthUser(db, email, { invite_token: token }));
      expect(msg).toMatch(/invalid, expired or already used/);
    }));

  it("creates a profile, marks the invite used, strips the token and writes an audit entry", () =>
    inTransaction(async (db) => {
      const email = testEmail("valid");
      const token = await createInvite(db, email);
      const id = await insertAuthUser(db, email, { invite_token: token, full_name: "Ada Lovelace" });

      const profile = await db.query("select full_name from public.profiles where id = $1", [id]);
      expect(profile.rows).toEqual([{ full_name: "Ada Lovelace" }]);

      const invite = await db.query("select used_by from public.invites where email = $1", [email]);
      expect(invite.rows[0].used_by).toBe(id);

      const meta = await db.query("select raw_user_meta_data from auth.users where id = $1", [id]);
      expect(meta.rows[0].raw_user_meta_data).not.toHaveProperty("invite_token");

      const audit = await db.query(
        "select action from public.audit_log where actor_id = $1 and action = 'auth.signed_up'",
        [id],
      );
      expect(audit.rowCount).toBe(1);
    }));

  it("lets anyone check a token but only the database owner create invites", () =>
    inTransaction(async (db) => {
      const email = testEmail("check");
      const token = await createInvite(db, email);

      const checked = await as(db, "anon", () => db.query("select public.check_invite($1) as email", [token]));
      expect(checked.rows[0].email).toBe(email);

      const wrong = await as(db, "anon", () => db.query("select public.check_invite('nope') as email"));
      expect(wrong.rows[0].email).toBeNull();

      await expectError(as(db, "anon", () => db.query("select public.create_invite('x@example.test')")));
      await expectError(
        as(db, { id: crypto.randomUUID(), aal: "aal2" }, () =>
          db.query("select public.create_invite('x@example.test')"),
        ),
      );
    }));
});
