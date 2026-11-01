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

export type Role = "client" | "principal_designer" | "designer" | "principal_contractor" | "contractor";

export type ProjectOptions = {
  isDomesticClient?: boolean;
  domesticDutiesToPd?: boolean;
  expectedContractors?: number;
  cdmPdCertified?: boolean;
  ownerRole?: Role;
};

// Create a project as `ownerId` (aal2), the way the "New project" form does.
export async function createProject(db: PoolClient, ownerId: string, opts: ProjectOptions = {}): Promise<string> {
  const { rows } = await as(db, { id: ownerId, aal: "aal2" }, () =>
    db.query(
      "select public.create_project('Test project', '1 High St', 'Two-storey extension', $1, $2, false, $3, $4, $5) as id",
      [
        opts.isDomesticClient ?? false,
        opts.domesticDutiesToPd ?? false,
        opts.expectedContractors ?? 3,
        opts.cdmPdCertified ?? false,
        opts.ownerRole ?? "principal_designer",
      ],
    ),
  );
  return rows[0].id;
}

export async function addMember(
  db: PoolClient,
  ownerId: string,
  projectId: string,
  email: string,
  role: Role,
  isFirm = false,
): Promise<string> {
  const { rows } = await as(db, { id: ownerId, aal: "aal2" }, () =>
    db.query("select public.add_project_member($1, $2, '', $3, null, $4) as id", [projectId, email, role, isFirm]),
  );
  return rows[0].id;
}

// Active checklist codes for each member email, read as the database owner.
export async function activeCodesByEmail(db: PoolClient, projectId: string): Promise<Record<string, string[]>> {
  const { rows } = await db.query(
    `select m.email, i.template_code
     from public.checklist_items i join public.project_members m on m.id = i.member_id
     where i.project_id = $1 and i.withdrawn_at is null
     order by i.template_code`,
    [projectId],
  );
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.email] ??= []).push(r.template_code);
  return out;
}

// The id of a member's active checklist item with the given template code.
export async function itemId(db: PoolClient, projectId: string, email: string, code: string): Promise<string> {
  const { rows } = await db.query(
    `select i.id from public.checklist_items i join public.project_members m on m.id = i.member_id
     where i.project_id = $1 and m.email = $2 and i.template_code = $3 and i.withdrawn_at is null`,
    [projectId, email, code],
  );
  if (!rows[0]) throw new Error(`No ${code} item for ${email}`);
  return rows[0].id;
}

// Simulate a file upload: a storage object in the user's own folder.
export async function uploadObject(db: PoolClient, userId: string, fileName = "evidence.pdf"): Promise<string> {
  const path = `${userId}/${randomUUID()}-${fileName}`;
  await as(db, { id: userId, aal: "aal2" }, () =>
    db.query("insert into storage.objects (bucket_id, name, owner_id) values ('evidence', $1, $2)", [path, userId]),
  );
  return path;
}

export const FAKE_SHA = "a".repeat(64);
