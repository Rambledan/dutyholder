import Link from "next/link";
import {
  ArrowRight, BellRing, CalendarClock, FileCheck2, FolderArchive, LayoutDashboard, Lock, PenLine, PlayCircle,
  ScrollText, ShieldCheck, UserRoundCheck,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_MINUTES, MANUAL_MINUTES, SAVED_MINUTES_PER_PERSON, TIME_TASKS, formatMinutes } from "@/lib/landing";
import { AuthLink } from "./auth-link";
import { TimeCalculator } from "./time-calculator";

const SIGN_IN_LABEL = "Sign in / Sign up";
const MAX_MINUTES = Math.max(...TIME_TASKS.map((t) => t.manual));
const TEAM_OF_SIX_HOURS = Math.round((SAVED_MINUTES_PER_PERSON * 6) / 60);

// The public front page: what Dutyholder does and how much time it gives back.
export function Landing() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar />
      <main className="flex-1">
        <Hero />
        <TimeBreakdown />
        <Calculator />
        <HowItWorks />
        <Roles />
        <Security />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

const section = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const overline = "text-xs font-semibold tracking-[0.08em] text-subtle-foreground uppercase";
const h2 = "text-3xl font-medium tracking-[-0.03em] text-balance sm:text-[40px] sm:leading-[44px]";

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg text-lg font-semibold tracking-[-0.01em] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheck className="size-[18px]" strokeWidth={2.25} />
      </span>
      Dutyholder
    </Link>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 p-3 sm:p-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-3xl border border-border bg-card/90 px-4 py-3 shadow-card backdrop-blur sm:px-5">
        <Brand />
        <nav aria-label="Page" className="hidden items-center gap-1 text-[15px] md:flex">
          {[["#time", "Time saved"], ["#how", "How it works"], ["#roles", "Who it's for"], ["/demo", "Demo videos"]].map(([href, label]) => (
            <a key={href} href={href} className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">{label}</a>
          ))}
        </nav>
        <AuthLink className={buttonVariants()}>{SIGN_IN_LABEL}</AuthLink>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className={cn(section, "grid items-center gap-10 pt-10 pb-16 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-24")}>
      <div className="space-y-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[13px] text-muted-foreground">
          <span className="size-2 rounded-full bg-success" /> Building Regulations Part 2A · England
        </p>
        <h1 className="text-[44px] leading-[48px] font-medium tracking-[-0.035em] text-balance sm:text-6xl sm:leading-[64px]">
          Every dutyholder signed up. <span className="text-primary">None of the chasing.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Dutyholder handles the appointments, duty acknowledgements and competence evidence for your project,
          and sends the reminders for you. You save about{" "}
          <strong className="font-semibold text-foreground">{formatMinutes(SAVED_MINUTES_PER_PERSON)}</strong> on every
          person you appoint.
        </p>
        <div className="flex flex-wrap gap-3">
          <AuthLink className={cn(buttonVariants({ size: "lg" }), "h-12 px-5 text-base")}>
            {SIGN_IN_LABEL} <ArrowRight className="size-4" />
          </AuthLink>
          <Link href="/demo" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-5 text-base")}>
            <PlayCircle className="size-4" /> Watch the 2-minute demo
          </Link>
        </div>
        <p className="text-sm text-subtle-foreground">Invited to a project? Use <em>Sign up</em> with the link from your email.</p>
      </div>
      <HeroPreview />
    </section>
  );
}

// An illustration of the project dashboard, drawn with sample data.
function HeroPreview() {
  const rows: { name: string; role: string; dots: ("g" | "a" | "r")[] }[] = [
    { name: "Ama Owusu", role: "Client", dots: ["g", "g", "g", "g", "g"] },
    { name: "Northgate Structures", role: "Designer", dots: ["g", "g", "g", "a", "g"] },
    { name: "Firewise Engineering", role: "Designer", dots: ["g", "g", "a", "a", "r"] },
    { name: "Hale & Sons Build", role: "Principal contractor", dots: ["g", "g", "g", "g", "a"] },
  ];
  const dot = { g: "bg-success", a: "bg-warning", r: "bg-destructive" };
  return (
    <figure className="relative" aria-label="Example project dashboard">
      <div aria-hidden className="absolute -inset-4 -z-10 rounded-[32px] bg-[radial-gradient(60%_60%_at_70%_30%,var(--primary-soft),transparent)]" />
      <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-pop sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">14 Wharf Road</p>
            <p className="text-xl font-medium tracking-[-0.02em]">Dashboard</p>
          </div>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-success-soft px-2.5 text-[13px] font-medium text-success">
            <BellRing className="size-3.5" /> Chasing on
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted p-4">
            <p className={overline}>Duties complete</p>
            <p className="mt-1 text-3xl font-medium tabular-nums">16 of 20</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-card"><div className="h-full w-4/5 rounded-full bg-primary" /></div>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className={overline}>Your time this week</p>
            <p className="mt-1 text-3xl font-medium tabular-nums">12 min</p>
            <p className="mt-2 text-[13px] text-muted-foreground">Reviewing two competence packs</p>
          </div>
        </div>
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.name}</span>
                <span className="block text-xs text-muted-foreground">{r.role}</span>
              </span>
              <span className="flex shrink-0 gap-1.5">
                {r.dots.map((d, i) => <span key={i} className={cn("size-3 rounded-full", dot[d])} />)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-sm">
          <CalendarClock className="size-4 shrink-0 text-primary" />
          <span><span className="font-medium">Thursday 9am:</span> friendly nudge to Firewise Engineering, sent on your behalf</span>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-subtle-foreground">Illustration with sample data</figcaption>
    </figure>
  );
}

function TimeBreakdown() {
  return (
    <section id="time" className="scroll-mt-24 border-y border-border bg-card py-16 sm:py-24">
      <div className={cn(section, "grid gap-12 lg:grid-cols-[0.9fr_1.1fr]")}>
        <div className="space-y-5">
          <p className={overline}>Where the time goes</p>
          <h2 className={h2}>
            From {formatMinutes(MANUAL_MINUTES)} to {formatMinutes(APP_MINUTES)} per dutyholder.
          </h2>
          <p className="text-lg text-muted-foreground">
            Most Part 2A admin is letters, reminders and filing. Dutyholder handles those, so your time goes on
            reviewing competence and running the job.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl bg-muted p-5">
              <p className="text-4xl font-medium tracking-[-0.02em] tabular-nums">{Math.round((SAVED_MINUTES_PER_PERSON / MANUAL_MINUTES) * 100)}%</p>
              <p className="mt-1 text-sm text-muted-foreground">less admin per person</p>
            </div>
            <div className="rounded-2xl bg-muted p-5">
              <p className="text-4xl font-medium tracking-[-0.02em] tabular-nums">{TEAM_OF_SIX_HOURS}h</p>
              <p className="mt-1 text-sm text-muted-foreground">saved on a six-person team</p>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground" aria-hidden>
            <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-input" /> Email and spreadsheets</span>
            <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-primary" /> With Dutyholder</span>
          </div>
          <ul className="space-y-5">
            {TIME_TASKS.map((t) => (
              <li key={t.task}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{t.task}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    <span className="sr-only">Email and spreadsheets: </span>{formatMinutes(t.manual)} → <span className="sr-only">with Dutyholder: </span>
                    <span className="font-semibold text-primary">{formatMinutes(t.withApp)}</span>
                  </span>
                </div>
                <p className="mb-2 text-[13px] text-muted-foreground">{t.detail}</p>
                <div className="space-y-1" aria-hidden>
                  <div className="h-2.5 rounded-full bg-input/70" style={{ width: `${(t.manual / MAX_MINUTES) * 100}%` }} />
                  <div className="h-2.5 min-w-2.5 rounded-full bg-primary" style={{ width: `${(t.withApp / MAX_MINUTES) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-subtle-foreground">
            Estimates of the project owner&apos;s time for one dutyholder on a typical project. Your figures will vary.
          </p>
        </div>
      </div>
    </section>
  );
}

function Calculator() {
  return (
    <section className={cn(section, "py-16 sm:py-24")}>
      <div className="mb-8 max-w-2xl space-y-3">
        <p className={overline}>Your numbers</p>
        <h2 className={h2}>Work out your own saving.</h2>
        <p className="text-lg text-muted-foreground">Set the sliders to match your work. The totals use the estimates above.</p>
      </div>
      <TimeCalculator />
    </section>
  );
}

const STEPS = [
  {
    icon: UserRoundCheck, title: "Set up in about 10 minutes",
    body: "Add the project and invite each person by email with their statutory role. Everyone gets only the duties that apply to them.",
  },
  {
    icon: BellRing, title: "Reminders go out for you",
    body: "A polite nudge first, then firmer reminders. Weekdays 8am to 6pm, one email a day at most, signed on your behalf. You can pause anyone you'd rather call yourself.",
  },
  {
    icon: LayoutDashboard, title: "Watch it turn green",
    body: "A grid of people and duties shows who has finished and who is waiting on your review. It also shows who needs a call.",
  },
  {
    icon: FolderArchive, title: "Export the evidence pack",
    body: "Download one zip file with the signed appointments, competence decisions, acknowledgements and the audit trail.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className={cn(section, "scroll-mt-24 pb-16 sm:pb-24")}>
      <div className="mb-10 max-w-2xl space-y-3">
        <p className={overline}>How it works</p>
        <h2 className={h2}>Set the project up once. The reminders run themselves.</h2>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><s.icon className="size-5" /></span>
              <span className="text-sm font-medium text-subtle-foreground tabular-nums">0{i + 1}</span>
            </div>
            <h3 className="text-lg font-medium tracking-[-0.01em]">{s.title}</h3>
            <p className="mt-2 text-[15px] text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const ROLES = [
  { role: "Principal designer", gets: "Usually runs the project in Dutyholder: invites the team, reviews competence and keeps an eye on the dashboard. Most of the time saved is theirs." },
  { role: "Client", gets: "Signs appointments online and records competence decisions on the principal designer and principal contractor." },
  { role: "Designer", gets: "Acknowledges their duties, fills in their competence statement and uploads evidence, usually in one sitting." },
  { role: "Principal contractor", gets: "Does the same for the construction side, and sees who else is on the team." },
  { role: "Contractor", gets: "Gets a short list of what applies to them, opened from one link in the email." },
];

function Roles() {
  return (
    <section id="roles" className="scroll-mt-24 border-y border-border bg-card py-16 sm:py-24">
      <div className={cn(section, "grid gap-10 lg:grid-cols-[0.8fr_1.2fr]")}>
        <div className="space-y-4">
          <p className={overline}>Who it&apos;s for</p>
          <h2 className={h2}>Each role sees only what applies to them.</h2>
          <p className="text-lg text-muted-foreground">
            One account covers all your projects, with a different role on each. Your competence passport is saved
            to your account, so you don&apos;t fill it in again for the next job.
          </p>
          <div className="flex items-center gap-3 rounded-2xl bg-muted p-4 text-sm">
            <PenLine className="size-5 shrink-0 text-primary" />
            <span>Designed so a dutyholder can finish in about <strong className="font-semibold">15 minutes</strong>, from a single email.</span>
          </div>
        </div>
        <ul className="divide-y divide-border rounded-3xl border border-border">
          {ROLES.map((r) => (
            <li key={r.role} className="grid gap-1 p-5 sm:grid-cols-[180px_1fr] sm:gap-6">
              <span className="font-medium">{r.role}</span>
              <span className="text-[15px] text-muted-foreground">{r.gets}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const SECURITY = [
  { icon: Lock, title: "Two-factor sign-in", body: "Everyone signs in with a password and a code from an authenticator app." },
  { icon: ShieldCheck, title: "Only your project", body: "People see only the projects they're on and what their role needs. The database enforces this, not just the screens." },
  { icon: ScrollText, title: "A full audit trail", body: "Every change, signature, upload and email is logged. The log can't be edited." },
  { icon: FileCheck2, title: "Statutory wording", body: "Duties follow regulations 11A to 11Q, using the role names from the Building Regulations." },
];

function Security() {
  return (
    <section className={cn(section, "py-16 sm:py-24")}>
      <div className="mb-10 max-w-2xl space-y-3">
        <p className={overline}>Security and records</p>
        <h2 className={h2}>Every step is on the record.</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECURITY.map((s) => (
          <div key={s.title} className="space-y-2 rounded-3xl bg-muted p-6">
            <s.icon className="size-5 text-primary" />
            <h3 className="font-medium">{s.title}</h3>
            <p className="text-[15px] text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={cn(section, "pb-16 sm:pb-24")}>
      <div className="flex flex-col items-start gap-6 rounded-3xl bg-nav-active p-8 text-nav-active-foreground sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <h2 className={h2}>Get back about {TEAM_OF_SIX_HOURS} hours on your next project.</h2>
          <p className="text-lg opacity-75">Sign in to your projects, or use your invite link to join one.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AuthLink className={cn(buttonVariants({ size: "lg" }), "h-12 px-5 text-base")}>
            {SIGN_IN_LABEL} <ArrowRight className="size-4" />
          </AuthLink>
          <Link href="/demo" className="inline-flex h-12 items-center gap-2 rounded-lg border border-nav-active-foreground/25 px-5 text-base font-medium hover:bg-nav-active-foreground/10">
            <PlayCircle className="size-4" /> Watch the demo
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className={cn(section, "flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-muted-foreground")}>
        <Brand />
        <p>For dutyholder duties under Part 2A of the Building Regulations 2010 (England). Not legal advice.</p>
        <div className="flex gap-4">
          <a href="/help" className="hover:text-foreground">Help</a>
          <a href="/demo" className="hover:text-foreground">Demo videos</a>
          <AuthLink className="hover:text-foreground">Sign in</AuthLink>
        </div>
      </div>
    </footer>
  );
}
