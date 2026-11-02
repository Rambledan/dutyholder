// Works out which sidebar links a signed-in person sees. Kept free of
// Next.js and Supabase so it can be unit-tested. The pages themselves still
// check access through RLS; this only hides links that would lead nowhere.

import { roleLabel, type DutyholderRole } from "@/lib/labels";

export type NavIcon =
  | "projects" | "new" | "dashboard" | "people" | "tasks" | "exports" | "settings"
  | "report" | "details" | "competence" | "help";

export type NavItem = { href: string; label: string; icon: NavIcon; count?: number };
export type NavSection = { label: string; items: NavItem[] };

// One row per project the person can see, built from their memberships.
export type ProjectScope = {
  id: string;
  name: string;
  roles: DutyholderRole[];
  isOwner: boolean;
  openTasks: number;
};

// "/projects/<id>/anything" → "<id>"; anything else → null.
export function projectIdFromPath(path: string): string | null {
  const m = /^\/projects\/([^/]+)/.exec(path);
  return m && m[1] !== "new" ? m[1] : null;
}

// "Principal designer · Owner", or "Owner" for an owner with no statutory role.
export function scopeSubtitle(p: ProjectScope): string {
  const parts = p.roles.map((r) => roleLabel(r));
  if (p.isOwner) parts.push("Owner");
  return parts.join(" · ") || "Member";
}

export function navSections(project: ProjectScope | null): NavSection[] {
  const sections: NavSection[] = [
    {
      label: "Workspace",
      items: [
        { href: "/", label: "All projects", icon: "projects" },
        { href: "/projects/new", label: "New project", icon: "new" },
      ],
    },
  ];

  if (project) {
    const base = `/projects/${project.id}`;
    const items: NavItem[] = [];
    // Owners run the project: dashboard, people and letters, evidence, settings.
    if (project.isOwner) {
      items.push(
        { href: `${base}/dashboard`, label: "Dashboard", icon: "dashboard" },
        { href: base, label: "People & appointments", icon: "people" },
      );
    }
    // Anyone holding a statutory role has duties of their own to complete.
    if (project.roles.length > 0) {
      items.push({ href: `${base}/tasks`, label: "My tasks", icon: "tasks", count: project.openTasks || undefined });
    }
    if (project.isOwner) {
      items.push(
        { href: `${base}/exports`, label: "Evidence pack", icon: "exports" },
        { href: `${base}/edit`, label: "Project settings", icon: "settings" },
      );
    }
    if (project.roles.length > 0 && !project.isOwner) {
      items.push({ href: `${base}/report-change`, label: "Report a change", icon: "report" });
    }
    sections.push({ label: "This project", items });
  }

  sections.push({
    label: "Account",
    items: [
      { href: "/account", label: "My details", icon: "details" },
      { href: "/account/competence", label: "Competence passport", icon: "competence" },
      { href: "/help", label: "Help", icon: "help" },
    ],
  });
  return sections;
}

// The link to highlight: the longest href that the current path starts with,
// so "/projects/x/tasks/123" lights up "My tasks" rather than the project page.
export function activeHref(path: string, sections: NavSection[]): string | null {
  let best: string | null = null;
  for (const item of sections.flatMap((s) => s.items)) {
    const hit = item.href === "/" ? path === "/" : path === item.href || path.startsWith(item.href + "/");
    if (hit && (!best || item.href.length > best.length)) best = item.href;
  }
  return best;
}
