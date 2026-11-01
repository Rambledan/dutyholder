import { describe, expect, it } from "vitest";
import { decideAccess, INACTIVITY_LIMIT_MS, safeNextPath, type AccessState } from "@/lib/auth/routing";

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
  it("sends signed-out visitors to login, remembering where they were going", () => {
    expect(decideAccess({ ...base, path: "/" })).toEqual({ kind: "redirect", to: "/login" });
    expect(decideAccess({ ...base, path: "/projects/1" })).toEqual({
      kind: "redirect",
      to: "/login?next=%2Fprojects%2F1",
    });
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

describe("safeNextPath", () => {
  it("only allows paths on this site", () => {
    expect(safeNextPath("/projects/1")).toBe("/projects/1");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
  });
});
