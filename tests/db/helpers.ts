// Helpers for testing RLS rules directly against the DEV database.
// Every test runs inside a transaction that is rolled back, so nothing is
// left behind. We pretend to be a signed-in user by setting the same JWT
// claims Supabase would set, then switching to the "authenticated" role.
import { Pool, type PoolClient } from "pg";
import { randomUUID } from "node:crypto";

const url = process.env.DEV_DATABASE_URL;

export const pool = url
  ? new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 1 })
  : null;

export function requireDb(): Pool {
  if (!pool) {
    throw new Error("DEV_DATABASE_URL is not set in .env.local. See .env.example (dev project only).");
  }
  return pool;
}

export async function inTransaction(fn: (db: PoolClient) => Promise<void>) {
  const client = await requireDb().connect();
  try {
    await client.query("begin");
    await fn(client);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

type Who = { id: string; aal: "aal1" | "aal2" } | "anon";

// Run fn as a particular user (or anonymous visitor), then switch back to
// the database owner. Uses a savepoint so an expected error doesn't abort
// the whole test transaction.
export async function as<T>(db: PoolClient, who: Who, fn: () => Promise<T>): Promise<T> {
  const claims =
    who === "anon"
      ? { role: "anon" }
      : { sub: who.id, role: "authenticated", aal: who.aal, email: `${who.id}@example.test` };
  await db.query("savepoint as_user");
  await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
  await db.query(`set local role ${who === "anon" ? "anon" : "authenticated"}`);
  try {
    const result = await fn();
    await db.query("reset role");
    await db.query("select set_config('request.jwt.claims', '', true)");
    await db.query("release savepoint as_user");
    return result;
  } catch (err) {
    await db.query("rollback to savepoint as_user");
    await db.query("reset role");
    await db.query("select set_config('request.jwt.claims', '', true)");
    throw err;
  }
}

// Expect a statement to be refused. Returns the error message.
export async function expectError(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err) {
    return (err as Error).message;
  }
  throw new Error("Expected the database to refuse this, but it was allowed");
}

export async function createInvite(db: PoolClient, email: string): Promise<string> {
  const { rows } = await db.query("select public.create_invite($1) as token", [email]);
  return rows[0].token;
}

// Insert a user the way Supabase Auth does when someone signs up.
export async function insertAuthUser(
  db: PoolClient,
  email: string,
  metadata: Record<string, unknown>,
): Promise<string> {
  const id = randomUUID();
  await db.query(
    `insert into auth.users
       (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data,
        raw_app_meta_data, email_confirmed_at, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             $2, '', $3, '{}', now(), now(), now())`,
    [id, email, JSON.stringify(metadata)],
  );
  return id;
}

let counter = 0;
export function testEmail(label: string): string {
  counter += 1;
  return `rls-test-${label}-${Date.now()}-${counter}@example.test`;
}

// A fully signed-up user (valid invite), returned with their id.
export async function signUpUser(db: PoolClient, label: string, fullName = label) {
  const email = testEmail(label);
  const token = await createInvite(db, email);
  const id = await insertAuthUser(db, email, { invite_token: token, full_name: fullName });
  return { id, email };
}

export async function addVerifiedTotpFactor(db: PoolClient, userId: string): Promise<string> {
  const id = randomUUID();
  await db.query(
    `insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, secret, created_at, updated_at)
     values ($1, $2, $3, 'totp', 'verified', 'TESTSECRET', now(), now())`,
    [id, userId, `test-${id}`],
  );
  return id;
}
