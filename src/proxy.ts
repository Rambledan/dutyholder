import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "@/lib/auth/routing";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

const LAST_SEEN_COOKIE = "dh_last_seen";

// Runs before every page. It refreshes the Supabase session cookie and sends
// anyone who hasn't completed two-factor back to the right login step.
// This is the first lock; pages re-check on the server, and the database's
// RLS rules are the final lock.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() verifies the session token's signature, so it can be trusted.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const signedIn = Boolean(claims?.sub);

  // Password-only users: ask the Supabase server (not the cookie) whether
  // they already have an authenticator, to pick the code or set-up screen.
  let hasVerifiedFactor = false;
  if (signedIn && claims?.aal !== "aal2") {
    const { data: userData } = await supabase.auth.getUser();
    hasVerifiedFactor = Boolean(userData.user?.factors?.some((f) => f.status === "verified"));
  }

  const lastSeenRaw = request.cookies.get(LAST_SEEN_COOKIE)?.value;
  const lastSeenMs = lastSeenRaw ? Number(lastSeenRaw) : null;
  const nowMs = Date.now();

  const decision = decideAccess({
    path: request.nextUrl.pathname,
    signedIn,
    aal: (claims?.aal as "aal1" | "aal2" | undefined) ?? null,
    hasVerifiedFactor,
    lastSeenMs: Number.isFinite(lastSeenMs) ? lastSeenMs : null,
    nowMs,
  });

  if (decision.kind === "timeout") {
    await supabase.auth.signOut();
    const redirect = NextResponse.redirect(new URL("/login?reason=timeout", request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    redirect.cookies.delete(LAST_SEEN_COOKIE);
    return redirect;
  }

  if (decision.kind === "redirect") {
    const redirect = NextResponse.redirect(new URL(decision.to, request.url));
    // Keep any refreshed session cookies on the redirect.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    if (signedIn) setLastSeen(redirect, nowMs);
    return redirect;
  }

  if (signedIn) setLastSeen(response, nowMs);
  // A stale timestamp from an old session must not time out the next login.
  else if (lastSeenRaw) response.cookies.delete(LAST_SEEN_COOKIE);
  return response;
}

function setLastSeen(response: NextResponse, nowMs: number) {
  response.cookies.set(LAST_SEEN_COOKIE, String(nowMs), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export const config = {
  // Run on everything except Next.js internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)"],
};
