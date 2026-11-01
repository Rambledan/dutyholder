import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

// A Supabase client with the secret (service role) key. It bypasses every
// RLS rule, so it is used ONLY by the scheduled chasing job (and, later, the
// export job), as PLAN.md and CLAUDE.md require. Never import it into a page,
// component or server action.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set. See .env.example.");
  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
