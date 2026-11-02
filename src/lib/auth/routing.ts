// Decides where a request is allowed to go, based on how far through login
// the visitor is. Kept free of Next.js and Supabase so it can be unit-tested.

export const INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000; // 12 hours

// Pages anyone can open without signing in.
const PUBLIC_PATHS = ["/login", "/signup"];
// Pages open to everyone at every stage of login (signed out, part-way
// through two-factor, or fully signed in). They show no project data.
const OPEN_PATHS = ["/help", "/demo"];
// Pages for someone who has typed their password but not yet their 2FA code.
const ENROL_PATH = "/mfa/enrol";
const VERIFY_PATHS = ["/mfa/verify", "/mfa/recover"];

export type AccessState = {
  path: string;
  signedIn: boolean;
  // aal1 = password only; aal2 = password + authenticator code.
  aal: "aal1" | "aal2" | null;
  // True when the user has a verified authenticator and so must enter a code.
  hasVerifiedFactor: boolean;
  lastSeenMs: number | null;
  nowMs: number;
};

export type Decision =
  | { kind: "allow" }
  | { kind: "redirect"; to: string }
  | { kind: "timeout" };

function matches(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(p + "/"));
}

export function decideAccess(s: AccessState): Decision {
  if (matches(s.path, OPEN_PATHS)) return { kind: "allow" };
  const isPublic = matches(s.path, PUBLIC_PATHS);

  if (!s.signedIn) {
    if (isPublic) return { kind: "allow" };
    const next = s.path === "/" ? "" : `?next=${encodeURIComponent(s.path)}`;
    return { kind: "redirect", to: `/login${next}` };
  }

  if (s.lastSeenMs !== null && s.nowMs - s.lastSeenMs > INACTIVITY_LIMIT_MS) {
    return { kind: "timeout" };
  }

  if (s.aal === "aal2") {
    // Fully signed in: no reason to see login or 2FA screens.
    if (isPublic || matches(s.path, [ENROL_PATH, ...VERIFY_PATHS])) {
      return { kind: "redirect", to: "/" };
    }
    return { kind: "allow" };
  }

  // Password only. Every page is blocked except the 2FA step they need.
  if (s.hasVerifiedFactor) {
    return matches(s.path, VERIFY_PATHS) ? { kind: "allow" } : { kind: "redirect", to: "/mfa/verify" };
  }
  return matches(s.path, [ENROL_PATH]) ? { kind: "allow" } : { kind: "redirect", to: ENROL_PATH };
}

// Only allow redirects back to our own pages, never to another site.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
