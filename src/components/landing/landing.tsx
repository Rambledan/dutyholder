import Link from "next/link";
import {
  ArrowRight, BellRing, CalendarClock, ClipboardList, FolderArchive, Lock, PlayCircle, ScrollText, ShieldCheck,
  UserRoundCheck, Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DISCLAIMER } from "@/lib/disclaimer";
import { cn } from "@/lib/utils";
import { AuthLink } from "./auth-link";
import { RoleTabs, type RoleTab } from "./role-tabs";

const SIGN_IN_LABEL = "Sign in / Sign up";

// The public front page, following the communications briefing. It describes
// only what is built today: no AI, pilot sign-up or pricing yet, and no claim
// about hosting location until production's region is confirmed.
export function Landing() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar />
      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <Pillars />
        <Roles />
        <Deadlines />
        <Security />
        <GrowsWithYou />
        <Faq />
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
          {[["#how", "How it works"], ["#features", "Features"], ["#roles", "Who it's for"], ["#faq", "FAQ"], ["/demo", "Demo videos"]].map(([href, label]) => (
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
          Your principal designer duties, <span className="text-primary">run with your whole team.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Dutyholder is the shared workspace for Building Regulations compliance. Appoint your team, assign every
          relevant requirement, and let it chase outstanding duties and statutory deadlines, with the evidence filed
          as you go.
        </p>
        <div className="flex flex-wrap gap-3">
          <AuthLink className={cn(buttonVariants({ size: "lg" }), "h-12 px-5 text-base")}>
            {SIGN_IN_LABEL} <ArrowRight className="size-4" />
          </AuthLink>
          <Link href="/demo" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-5 text-base")}>
            <PlayCircle className="size-4" /> Watch the demo videos
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
            <p className={overline}>Next legal deadline</p>
            <p className="mt-1 text-3xl font-medium tabular-nums">12 days</p>
            <p className="mt-2 text-[13px] text-muted-foreground">Principal designer handover</p>
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

function Problem() {
  return (
    <section className="border-y border-border bg-card py-16 sm:py-24">
      <div className={cn(section, "max-w-3xl space-y-4")}>
        <p className={overline}>The problem</p>
        <h2 className={h2}>The 2023 regulations made every project a compliance project.</h2>
        <p className="text-lg text-muted-foreground">
          Since October 2023, Part 2A gives every client, designer and contractor written duties, competence
          requirements and deadlines. Most teams still manage them on spreadsheets and email, and the principal
          designer is left holding it all together. The work isn&apos;t new. Having to prove it, years later, is.
        </p>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: UserRoundCheck, title: "Set up the project", body: "Answer a few scoping questions. Dutyholder works out which duties apply to whom." },
  { icon: Users, title: "Invite your team", body: "Each dutyholder gets the duties and competence form for their role, and a list of the requirements assigned to them." },
  { icon: BellRing, title: "Everyone does their part", body: "Designers write their own project-specific answers. Dutyholder sends polite reminders for outstanding duties and legal deadlines." },
  { icon: FolderArchive, title: "Evidence, ready", body: "Signed appointments, competence records, the full tracker and an audit trail, in one pack." },
];

function HowItWorks() {
  return (
    <section id="how" className={cn(section, "scroll-mt-24 py-16 sm:py-24")}>
      <div className="mb-10 max-w-2xl space-y-3">
        <p className={overline}>How it works</p>
        <h2 className={h2}>From appointment to evidence pack, in four steps.</h2>
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

const PILLARS = [
  { icon: UserRoundCheck, title: "Appoint the right team", body: "Written appointments, e-signed. Competence statements in the four parts the law asks for, reviewed and recorded." },
  { icon: ClipboardList, title: "Every requirement, owned", body: "A Relevant Requirements Tracker, built in. Each row has an owner and a link to the regulation it comes from." },
  { icon: BellRing, title: "It does the chasing", body: "No more than one reminder email per person per day, and a red, amber and green view of your whole team." },
  { icon: CalendarClock, title: "Never miss a deadline", body: "The 14-day notification, the 28-day handover and the 5-day completion statements, counted down for you." },
  { icon: FolderArchive, title: "Evidence on demand", body: "Every action logged and every file fingerprinted. Export the pack in one click." },
];

function Pillars() {
  return (
    <section id="features" className="scroll-mt-24 border-y border-border bg-card py-16 sm:py-24">
      <div className={section}>
        <div className="mb-10 max-w-2xl space-y-3">
          <p className={overline}>What it does</p>
          <h2 className={h2}>Who has to do what, by when, and the proof that they did.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="space-y-2 rounded-3xl bg-muted p-6">
              <p.icon className="size-5 text-primary" />
              <h3 className="text-lg font-medium tracking-[-0.01em]">{p.title}</h3>
              <p className="text-[15px] text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const ROLE_TABS: RoleTab[] = [
  { role: "Principal designers", headline: "Coordinate the design team without the inbox.", points: [
    "Assign every relevant requirement and see the gaps at a glance.",
    "Review competence and record your decision.",
    "Your record of how you planned, managed and monitored builds as the project runs.",
  ] },
  { role: "Designers and engineers", headline: "Your requirements, in one list.", points: [
    "Keep your standard wording next to the project detail, and write the answers for your own area.",
    "Raise a concern about related design, and get a response on the record.",
    "Your competence passport is saved, so you don't start again on the next job.",
  ] },
  { role: "Clients", headline: "Know who's appointed and what's outstanding.", points: [
    "Sign appointments online in a few clicks.",
    "Record your decision on each principal's competence.",
    "Sign your completion statement when the work is done.",
  ] },
  { role: "Principal contractors", headline: "Join up with the design team's record from day one.", points: [
    "Read the tracker and exchange comments with the principal designer, on the record.",
    "Receive concerns from your contractors and record your response.",
    "Your 28-day handover and completion statement are tracked too.",
  ] },
];

function Roles() {
  return (
    <section id="roles" className={cn(section, "scroll-mt-24 py-16 sm:py-24")}>
      <div className="mb-10 max-w-2xl space-y-3">
        <p className={overline}>Built for every dutyholder</p>
        <h2 className={h2}>Each role gets the duties that apply to it.</h2>
      </div>
      <RoleTabs tabs={ROLE_TABS} />
    </section>
  );
}

const CLOCKS = [
  { days: "14", label: "days", body: "Notify building control of a new principal appointment" },
  { days: "28", label: "days", body: "The principal designer's handover document" },
  { days: "5", label: "days", body: "Completion statements" },
];

function Deadlines() {
  return (
    <section className="bg-nav-active py-16 text-nav-active-foreground sm:py-24">
      <div className={cn(section, "space-y-10")}>
        <div className="grid gap-8 sm:grid-cols-3">
          {CLOCKS.map((c) => (
            <div key={c.days}>
              <p className="text-7xl font-medium tracking-[-0.04em] tabular-nums">{c.days}<span className="ml-2 text-2xl tracking-normal opacity-70">{c.label}</span></p>
              <p className="mt-3 text-lg opacity-75">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="text-lg">Dutyholder starts each clock from the date you record, and reminds the right person.</p>
      </div>
    </section>
  );
}

const SECURITY = [
  { icon: Lock, title: "Two-factor login for everyone", body: "A password and a code from an authenticator app, every time." },
  { icon: ShieldCheck, title: "Access limited to your own projects", body: "The database enforces this, not just the screens." },
  { icon: ScrollText, title: "Tamper-evident audit trail", body: "The log can only be added to, and every file has a fingerprint." },
];

function Security() {
  return (
    <section className={cn(section, "py-16 sm:py-24")}>
      <div className="mb-10 max-w-2xl space-y-3">
        <p className={overline}>Security and trust</p>
        <h2 className={h2}>Every step is on the record.</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
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

function GrowsWithYou() {
  return (
    <section className={cn(section, "pb-16 sm:pb-24")}>
      <div className="max-w-3xl space-y-4">
        <p className={overline}>Grows with you</p>
        <h2 className={h2}>From appointment to completion, one workspace for the design and build team.</h2>
        <p className="text-lg text-muted-foreground">
          Start with your principal designer duties. Bring in the principal contractor for the construction phase, and
          keep the record through to the completion notice.
        </p>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Is this only for higher-risk buildings?", a: "No. Part 2A applies to almost all building work needing approval in England. Dutyholder is built for non-higher-risk projects, and doesn't support higher-risk building work." },
  { q: "Does it replace our requirements tracker?", a: "It's built around the Relevant Requirements Tracker structure principal designers already use, as a live shared version with owners and evidence." },
  { q: "Who writes the compliance answers?", a: "The responsible designer, always. The principal designer coordinates the tracker but can't write another designer's answer." },
  { q: "Does it make my project compliant?", a: "No software can. It helps you plan, manage, monitor and evidence the process, and the duties stay with the dutyholders." },
  { q: "Who can see my data?", a: "Only the people on your project, behind two-factor login." },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-y border-border bg-card py-16 sm:py-24">
      <div className={cn(section, "grid gap-10 lg:grid-cols-[0.8fr_1.2fr]")}>
        <div className="space-y-3">
          <p className={overline}>FAQ</p>
          <h2 className={h2}>Questions principal designers ask.</h2>
        </div>
        <dl className="divide-y divide-border rounded-3xl border border-border">
          {FAQS.map((f) => (
            <div key={f.q} className="space-y-1 p-5">
              <dt className="font-medium">{f.q}</dt>
              <dd className="text-[15px] text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={cn(section, "py-16 sm:py-24")}>
      <div className="flex flex-col items-start gap-6 rounded-3xl bg-nav-active p-8 text-nav-active-foreground sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <h2 className={h2}>Your duties, your team and your evidence in one place.</h2>
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
      <div className={cn(section, "space-y-4 py-8 text-sm text-muted-foreground")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Brand />
          <div className="flex gap-4">
            <a href="/help" className="hover:text-foreground">Help</a>
            <a href="/demo" className="hover:text-foreground">Demo videos</a>
            <AuthLink className="hover:text-foreground">Sign in</AuthLink>
          </div>
        </div>
        <p className="max-w-3xl">{DISCLAIMER}</p>
      </div>
    </footer>
  );
}
