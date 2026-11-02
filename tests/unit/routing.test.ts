import { describe, expect, it } from "vitest";
import {
  authAliasTarget, decideAccess, INACTIVITY_LIMIT_MS, parseAuthMode, safeNextPath, signInPath, type AccessState,
} from "@/lib/auth/routing";

const now = Date.UTC(2026, 10, 1, 9, 0, 0);
const base: AccessState = {
  path: "/",
  signedIn: false,
  aal: null,
  hasVerifiedFactor: false,
  lastSeenMs: null,
  nowMs: now,
};

describe("decideAccess", () => {
  it("shows signed-out visitors the landing page", () => {
    expect(decideAccess({ ...base, path: "/" })).toEqual({ kind: "allow" });
  });

  it("sends signed-out visitors to the sign-in lightbox, remembering where they were going", () => {
    expect(decideAccess({ ...base, path: "/projects/1" })).toEqual({
      kind: "redirect",
      to: "/?auth=signin&next=%2Fprojects%2F1",
    });
    expect(decideAccess({ ...base, path: "/account" })).toEqual({ kind: "redirect", to: "/?auth=signin&next=%2Faccount" });
  });

  it("lets signed-out visitors see login and sign-up only", () => {
    expect(decideAccess({ ...base, path: "/login" })).toEqual({ kind: "allow" });
    expect(decideAccess({ ...base, path: "/signup" })).toEqual({ kind: "allow" });
    expect(decideAccess({ ...base, path: "/mfa/verify" }).kind).toBe("redirect");
  });

  it("blocks every page for a password-only user who has not enrolled 2FA", () => {
    const s = { ...base, signedIn: true, aal: "aal1" as const };
    expect(decideAccess({ ...s, path: "/" })).toEqual({ kind: "redirect", to: "/mfa/enrol" });
    expect(decideAccess({ ...s, path: "/mfa/verify" })).toEqual({ kind: "redirect", to: "/mfa/enrol" });
    expect(decideAccess({ ...s, path: "/mfa/enrol" })).toEqual({ kind: "allow" });
  });

  it("blocks every page for a password-only user until they enter their code", () => {
    const s = { ...base, signedIn: true, aal: "aal1" as const, hasVerifiedFactor: true };
    expect(decideAccess({ ...s, path: "/" })).toEqual({ kind: "redirect", to: "/mfa/verify" });
    expect(decideAccess({ ...s, path: "/mfa/enrol" })).toEqual({ kind: "redirect", to: "/mfa/verify" });
    expect(decideAccess({ ...s, path: "/mfa/verify" })).toEqual({ kind: "allow" });
    expect(decideAccess({ ...s, path: "/mfa/recover" })).toEqual({ kind: "allow" });
  });

  it("lets aal2 users in and keeps them away from login screens", () => {
    const s = { ...base, signedIn: true, aal: "aal2" as const, hasVerifiedFactor: true };
    expect(decideAccess({ ...s, path: "/" })).toEqual({ kind: "allow" });
    expect(decideAccess({ ...s, path: "/login" })).toEqual({ kind: "redirect", to: "/" });
    expect(decideAccess({ ...s, path: "/mfa/verify" })).toEqual({ kind: "redirect", to: "/" });
  });

  it("lets anyone read Help and the demo videos, at every stage of login", () => {
    expect(decideAccess({ ...base, path: "/help" })).toEqual({ kind: "allow" });
    expect(decideAccess({ ...base, path: "/help", signedIn: true, aal: "aal1", hasVerifiedFactor: true })).toEqual({ kind: "allow" });
    expect(decideAccess({ ...base, path: "/help", signedIn: true, aal: "aal2", hasVerifiedFactor: true })).toEqual({ kind: "allow" });
    expect(decideAccess({ ...base, path: "/helpful" }).kind).toBe("redirect");
    expect(decideAccess({ ...base, path: "/demo" })).toEqual({ kind: "allow" });
    expect(decideAccess({ ...base, path: "/demo", signedIn: true, aal: "aal1", hasVerifiedFactor: true })).toEqual({ kind: "allow" });
    expect(decideAccess({ ...base, path: "/demonstration" }).kind).toBe("redirect");
  });

  it("does not treat look-alike paths as public", () => {
    const s = { ...base, path: "/loginx" };
    expect(decideAccess(s).kind).toBe("redirect");
  });

  it("times out after 12 hours of inactivity", () => {
    const s = { ...base, signedIn: true, aal: "aal2" as const, hasVerifiedFactor: true };
    expect(decideAccess({ ...s, lastSeenMs: now - INACTIVITY_LIMIT_MS + 1000 })).toEqual({ kind: "allow" });
    expect(decideAccess({ ...s, lastSeenMs: now - INACTIVITY_LIMIT_MS - 1000 })).toEqual({ kind: "timeout" });
  });
});

describe("sign-in addresses", () => {
  it("builds the lightbox address", () => {
    expect(signInPath()).toBe("/?auth=signin");
    expect(signInPath({ next: "/" })).toBe("/?auth=signin");
    expect(signInPath({ reason: "timeout" })).toBe("/?auth=signin&reason=timeout");
  });

  it("forwards old /login and /signup links to the lightbox, keeping the invite token", () => {
    expect(authAliasTarget("/login", "")).toBe("/?auth=signin");
    expect(authAliasTarget("/login", "?reason=timeout")).toBe("/?reason=timeout&auth=signin");
    expect(authAliasTarget("/signup", "?token=abc&next=%2Fprojects%2F1%2Ftasks"))
      .toBe("/?token=abc&next=%2Fprojects%2F1%2Ftasks&auth=signup");
    expect(authAliasTarget("/loginx", "")).toBeNull();
    expect(authAliasTarget("/", "")).toBeNull();
  });

  it("only accepts the two lightbox modes", () => {
    expect(parseAuthMode("signin")).toBe("signin");
    expect(parseAuthMode("signup")).toBe("signup");
    expect(parseAuthMode("admin")).toBeNull();
    expect(parseAuthMode(["signin"])).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("only allows paths on this site", () => {
    expect(safeNextPath("/projects/1")).toBe("/projects/1");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
  });
});
