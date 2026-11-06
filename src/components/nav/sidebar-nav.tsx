"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Archive, Award, CalendarClock, Check, ChevronsUpDown, CircleHelp, FileWarning, LayoutDashboard, LayoutGrid,
  ListChecks, LogOut, Menu, MessageSquareWarning, Plus, Settings, ShieldCheck, UserRound, Users, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { activeHref, navSections, projectIdFromPath, scopeSubtitle, type NavIcon, type ProjectScope } from "@/lib/nav";
import { signOut } from "@/app/actions";

const ICONS: Record<NavIcon, LucideIcon> = {
  projects: LayoutGrid, new: Plus, dashboard: LayoutDashboard, people: Users, dates: CalendarClock, tasks: ListChecks, concerns: MessageSquareWarning,
  exports: Archive, settings: Settings, report: FileWarning, details: UserRound, competence: Award, help: CircleHelp,
};

// Remembers the last project chosen, so the project links stay in the menu
// on account and help pages. Per-browser convenience only.
const SCOPE_KEY = "dutyholder.scope";
const readScope = () => { try { return localStorage.getItem(SCOPE_KEY); } catch { return null; } };
const writeScope = (id: string | null) => {
  try { if (id) localStorage.setItem(SCOPE_KEY, id); else localStorage.removeItem(SCOPE_KEY); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(SCOPE_KEY));
};
const subscribeScope = (onChange: () => void) => {
  window.addEventListener(SCOPE_KEY, onChange);
  return () => window.removeEventListener(SCOPE_KEY, onChange);
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "—";

// Where choosing a project takes you: owners to the dashboard, everyone else
// to their own tasks.
const homeFor = (p: ProjectScope) => (p.isOwner ? `/projects/${p.id}/dashboard` : `/projects/${p.id}/tasks`);

type Props = { projects: ProjectScope[]; person: { name: string; email: string } };

export function SidebarNav({ projects, person }: Props) {
  const path = usePathname();
  const remembered = useSyncExternalStore(subscribeScope, readScope, () => null);
  // The mobile menu is open only on the page where it was opened, so it
  // closes itself when a link is followed.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const mobileOpen = openOn === path;
  const setMobileOpen = (open: boolean) => setOpenOn(open ? path : null);

  const fromPath = projectIdFromPath(path);
  useEffect(() => {
    if (fromPath) writeScope(fromPath);
  }, [fromPath]);

  const current = projects.find((p) => p.id === (fromPath ?? remembered)) ?? null;
  const body = <NavBody projects={projects} current={current} path={path} person={person} onChoose={writeScope} />;

  return (
    <>
      {/* Phones and tablets: a top bar with a menu button. */}
      <div className="sticky top-0 z-30 lg:hidden">
        <div className="flex items-center justify-between rounded-3xl border border-border bg-card px-4 py-3 shadow-card">
          <Brand />
          <button type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-controls="mobile-nav"
            className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
        {mobileOpen && (
          <div id="mobile-nav" className="mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl border border-border bg-card p-4 shadow-pop">
            {body}
          </div>
        )}
      </div>

      {/* Desktop: a fixed panel on the left. */}
      <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-68 shrink-0 flex-col overflow-y-auto rounded-3xl border border-border bg-card px-4 py-6 shadow-card lg:flex">
        <div className="px-2"><Brand /></div>
        <div className="mt-6 flex flex-1 flex-col">{body}</div>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-lg text-lg font-semibold tracking-[-0.01em] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheck className="size-[18px]" strokeWidth={2.25} />
      </span>
      Dutyholder
    </Link>
  );
}

function NavBody(props: Props & { current: ProjectScope | null; path: string; onChoose: (id: string | null) => void }) {
  const sections = navSections(props.current);
  const active = activeHref(props.path, sections);
  return (
    <div className="flex flex-1 flex-col">
      <ProjectSwitcher projects={props.projects} current={props.current} onChoose={props.onChoose} />
      <nav aria-label="Main" className="flex-1">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mx-3 mt-6 mb-2 text-xs font-semibold tracking-[0.08em] text-subtle-foreground uppercase">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon];
                const isActive = item.href === active;
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        isActive ? "bg-nav-active text-nav-active-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}>
                      <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{item.label}</span>
                      {item.count ? (
                        <span className="ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
                          aria-label={`${item.count} open`}>{item.count}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-6 flex items-center gap-3 border-t border-border px-2 pt-4">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{props.person.name || props.person.email}</span>
          {props.person.name && <span className="block truncate text-xs text-muted-foreground">{props.person.email}</span>}
        </span>
        <form action={signOut}>
          <button type="submit" title="Sign out"
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <LogOut className="size-[18px]" /><span className="sr-only">Sign out</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function ProjectSwitcher({ projects, current, onChoose }: { projects: ProjectScope[]; current: ProjectScope | null; onChoose: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const choose = (p: ProjectScope | null) => {
    setOpen(false);
    onChoose(p?.id ?? null);
    router.push(p ? homeFor(p) : "/");
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl bg-muted p-3 text-left hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_4%)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-semibold",
          current ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border")}>
          {current ? initials(current.name) : <LayoutGrid className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{current?.name ?? "All projects"}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {current ? scopeSubtitle(current) : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <ul role="listbox" aria-label="Choose a project"
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-pop">
          <Option selected={!current} onSelect={() => choose(null)} title="All projects" subtitle="Everything you're part of" />
          {projects.map((p) => (
            <Option key={p.id} selected={current?.id === p.id} onSelect={() => choose(p)} title={p.name} subtitle={scopeSubtitle(p)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Option(props: { selected: boolean; onSelect: () => void; title: string; subtitle: string }) {
  return (
    <li role="option" aria-selected={props.selected}>
      <button type="button" onClick={props.onSelect}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{props.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{props.subtitle}</span>
        </span>
        {props.selected && <Check className="size-4 shrink-0 text-primary" />}
      </button>
    </li>
  );
}
