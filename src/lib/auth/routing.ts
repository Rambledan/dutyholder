// Decides where a request is allowed to go, based on how far through login
// the visitor is. Kept free of Next.js and Supabase so it can be unit-tested.

export const INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000; // 12 hours

// The landing page. Signed-out visitors read about the product there and
// sign in, or accept an invite, in a lightbox over it.
const LANDING_PATH = "/";
// Old sign-in addresses (bookmarks, invite emails). The proxy forwards them
// to the lightbox on the landing page.
const AUTH_ALIASES: Record<string, AuthMode> = { "/login": "signin", "/signup": "signup" };
// Pages anyone can open without signing in.
const PUBLIC_PATHS = Object.keys(AUTH_ALIASES);
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
    if (isPublic || s.path === LANDING_PATH) return { kind: "allow" };
    return { kind: "redirect", to: signInPath({ next: s.path }) };
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

export type AuthMode = "signin" | "signup";

export function parseAuthMode(value: unknown): AuthMode | null {
  return value === "signin" || value === "signup" ? value : null;
}

// The landing page with the sign-in lightbox open.
export function signInPath(opts: { next?: string; reason?: "timeout" } = {}): string {
  const q = new URLSearchParams({ auth: "signin" });
  if (opts.next && opts.next !== "/") q.set("next", opts.next);
  if (opts.reason) q.set("reason", opts.reason);
  return `/?${q}`;
}

// Where an old /login or /signup address now lives, keeping its query
// (invite token, next page, timeout reason). Null for every other path.
export function authAliasTarget(path: string, search: string): string | null {
  const mode = AUTH_ALIASES[path];
  if (!mode) return null;
  const q = new URLSearchParams(search);
  q.set("auth", mode);
  return `/?${q}`;
}

// Only allow redirects back to our own pages, never to another site.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
