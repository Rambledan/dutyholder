import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signInPath } from "./routing";

// Call at the top of every protected page or server action. The proxy has
// already checked, but pages must not rely on that alone.
export async function requireAal2() {
  // Signed-in pages depend on who is asking, so never prerender them.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) redirect(signInPath());
  if (claims.aal !== "aal2") redirect("/mfa/verify");

  return { supabase, userId: claims.sub, email: (claims.email as string | undefined) ?? "" };
}

// For pages anyone may open: true only once password and 2FA are both done.
export async function isFullySignedIn() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.aal === "aal2";
}
