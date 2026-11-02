import { describe, expect, it } from "vitest";
import { activeHref, navSections, projectIdFromPath, scopeSubtitle, type ProjectScope } from "@/lib/nav";

const project = (overrides: Partial<ProjectScope> = {}): ProjectScope => ({
  id: "p1", name: "Riverside Wharf", roles: [], isOwner: false, openTasks: 0, ...overrides,
});
const labels = (p: ProjectScope | null) =>
  navSections(p).find((s) => s.label === "This project")?.items.map((i) => i.label) ?? [];

describe("navSections", () => {
  it("shows no project section until a project is chosen", () => {
    expect(navSections(null).map((s) => s.label)).toEqual(["Workspace", "Account"]);
  });

  it("gives an owner with no statutory role the running-the-project links only", () => {
    expect(labels(project({ isOwner: true }))).toEqual(["Dashboard", "People & appointments", "Evidence pack", "Project settings"]);
  });

  it("gives a dutyholder their tasks and the reg 11I report, but no owner pages", () => {
    expect(labels(project({ roles: ["designer"] }))).toEqual(["My tasks", "Report a change"]);
  });

  it("gives an owner who is also a dutyholder both sets", () => {
    expect(labels(project({ roles: ["principal_designer"], isOwner: true }))).toEqual(
      ["Dashboard", "People & appointments", "My tasks", "Evidence pack", "Project settings"],
    );
  });

  it("shows a count only when there are open tasks", () => {
    const tasks = (n: number) => navSections(project({ roles: ["contractor"], openTasks: n }))[1].items[0];
    expect(tasks(3).count).toBe(3);
    expect(tasks(0).count).toBeUndefined();
  });
});

describe("activeHref", () => {
  const sections = navSections(project({ roles: ["designer"], isOwner: true }));
  it("prefers the most specific link", () => {
    expect(activeHref("/projects/p1/tasks/abc", sections)).toBe("/projects/p1/tasks");
    expect(activeHref("/projects/p1/appointments/xyz", sections)).toBe("/projects/p1");
    expect(activeHref("/account/competence", sections)).toBe("/account/competence");
  });
  it("only matches home on the home page", () => {
    expect(activeHref("/", sections)).toBe("/");
    expect(activeHref("/help", sections)).toBe("/help");
  });
});

describe("helpers", () => {
  it("reads the project id from the path", () => {
    expect(projectIdFromPath("/projects/p1/tasks")).toBe("p1");
    expect(projectIdFromPath("/projects/new")).toBeNull();
    expect(projectIdFromPath("/account")).toBeNull();
  });
  it("describes the person's standing on a project", () => {
    expect(scopeSubtitle(project({ roles: ["principal_designer"], isOwner: true }))).toBe("Principal designer · Owner");
    expect(scopeSubtitle(project({ roles: ["client"] }))).toBe("Client");
  });
});
