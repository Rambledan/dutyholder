import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HELP_TERMS, HELP_TOPICS } from "@/lib/help/content";
import { decideAccess } from "@/lib/auth/routing";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}
const sources = sourceFiles(path.resolve(__dirname, "../../src")).map((f) => readFileSync(f, "utf8")).join("\n");

describe("help content", () => {
  it("has unique topic ids, and every term points at a real topic", () => {
    const ids = HELP_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [key, term] of Object.entries(HELP_TERMS)) {
      expect(ids, `term "${key}"`).toContain(term.topic);
    }
  });

  it("only uses ⓘ terms and ? topics that exist", () => {
    const termIds = [...sources.matchAll(/<Term id="([^"]+)"/g)].map((m) => m[1]);
    const topicIds = [...sources.matchAll(/<HelpLink[^>]*topic="([^"]+)"/g)].map((m) => m[1]);
    expect(termIds.length).toBeGreaterThan(15);
    expect(topicIds.length).toBeGreaterThan(10);
    for (const id of termIds) expect(Object.keys(HELP_TERMS), `<Term id="${id}">`).toContain(id);
    for (const id of topicIds) expect(HELP_TOPICS.map((t) => t.id), `<HelpLink topic="${id}">`).toContain(id);
  });

  it("is readable without signing in", () => {
    expect(decideAccess({ path: "/help", signedIn: false, aal: null, hasVerifiedFactor: false, lastSeenMs: null, nowMs: 0 }))
      .toEqual({ kind: "allow" });
  });
});
