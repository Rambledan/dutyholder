import { afterAll, describe, expect, it } from "vitest";
import { addVerifiedTotpFactor, as, expectError, inTransaction, pool, signUpUser } from "./helpers";

afterAll(() => pool?.end());

describe("2FA recovery codes", () => {
  it("only issues codes to a user who has passed 2FA", () =>
    inTransaction(async (db) => {
      const a = await signUpUser(db, "a");

      await expectError(as(db, { id: a.id, aal: "aal1" }, () => db.query("select public.generate_recovery_codes()")));

      const { rows } = await as(db, { id: a.id, aal: "aal2" }, () =>
        db.query("select public.generate_recovery_codes() as code"),
      );
      expect(rows).toHaveLength(10);
      for (const r of rows) expect(r.code).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);

      const stored = await db.query("select code_hash from public.mfa_recovery_codes where user_id = $1", [a.id]);
      expect(stored.rows.map((r) => r.code_hash)).not.toContain(rows[0].code);
    }));

  it("swaps a valid code for a reset of the authenticator, once only", () =>
    inTransaction(async (db) => {
      const a = await signUpUser(db, "a");
      await addVerifiedTotpFactor(db, a.id);
      const { rows } = await as(db, { id: a.id, aal: "aal2" }, () =>
        db.query("select public.generate_recovery_codes() as code"),
      );
      const code: string = rows[0].code;
      const halfLoggedIn = { id: a.id, aal: "aal1" as const };

      const wrong = await as(db, halfLoggedIn, () => db.query("select public.use_recovery_code('0000-0000-0000') as ok"));
      expect(wrong.rows[0].ok).toBe(false);

      const right = await as(db, halfLoggedIn, () =>
        db.query("select public.use_recovery_code($1) as ok", [code.toUpperCase()]),
      );
      expect(right.rows[0].ok).toBe(true);

      const factors = await db.query("select count(*)::int as n from auth.mfa_factors where user_id = $1", [a.id]);
      expect(factors.rows[0].n).toBe(0);

      const again = await as(db, halfLoggedIn, () => db.query("select public.use_recovery_code($1) as ok", [code]));
      expect(again.rows[0].ok).toBe(false);
    }));

  it("locks out after 5 wrong codes in 15 minutes", () =>
    inTransaction(async (db) => {
      const a = await signUpUser(db, "a");
      const { rows } = await as(db, { id: a.id, aal: "aal2" }, () =>
        db.query("select public.generate_recovery_codes() as code"),
      );
      const halfLoggedIn = { id: a.id, aal: "aal1" as const };

      for (let i = 0; i < 5; i++) {
        await as(db, halfLoggedIn, () => db.query("select public.use_recovery_code('0000-0000-0000')"));
      }
      const blocked = await as(db, halfLoggedIn, () =>
        db.query("select public.use_recovery_code($1) as ok", [rows[0].code]),
      );
      expect(blocked.rows[0].ok).toBe(false);
    }));

  it("won't let one user use another user's code", () =>
    inTransaction(async (db) => {
      const a = await signUpUser(db, "a");
      const b = await signUpUser(db, "b");
      await addVerifiedTotpFactor(db, a.id);
      const { rows } = await as(db, { id: a.id, aal: "aal2" }, () =>
        db.query("select public.generate_recovery_codes() as code"),
      );

      const stolen = await as(db, { id: b.id, aal: "aal1" }, () =>
        db.query("select public.use_recovery_code($1) as ok", [rows[0].code]),
      );
      expect(stolen.rows[0].ok).toBe(false);

      const factors = await db.query("select count(*)::int as n from auth.mfa_factors where user_id = $1", [a.id]);
      expect(factors.rows[0].n).toBe(1);
    }));
});
