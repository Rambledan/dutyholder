// The one place "now" comes from for anything to do with chasing. Mirrors
// project_now() in the database.

const DAY_MS = 24 * 60 * 60 * 1000;

export type ClockProject = {
  clock_offset_days?: number | null;
  is_demo?: boolean | null;
  demo_started_at?: string | null;
};

// Real projects: real time plus the offset. Demo projects: an anchored clock
// (10am on day 0, plus one calendar day per simulated day), so a demo plays
// out the same way whatever time you run it.
export function projectNow(project: ClockProject, base: Date = new Date()): Date {
  const start = project.is_demo && project.demo_started_at ? new Date(project.demo_started_at) : base;
  return new Date(start.getTime() + (project.clock_offset_days ?? 0) * DAY_MS);
}

// Calendar parts of a moment in UK time.
export function londonParts(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: parts.weekday as string, // Mon, Tue, …
  };
}

// Reminders only go out Monday to Friday, 8am to 6pm UK time.
export function isWorkingHours(d: Date): boolean {
  const { hour, weekday } = londonParts(d);
  return !["Sat", "Sun"].includes(weekday) && hour >= 8 && hour < 18;
}

// Whole days between two moments (never negative).
export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

// ISO week label, e.g. "2026-W45", in UK time. Used to send the owner's
// digest at most once a week.
export function isoWeek(d: Date): string {
  const { date } = londonParts(d);
  const t = new Date(`${date}T00:00:00Z`);
  const day = (t.getUTCDay() + 6) % 7; // Monday = 0
  t.setUTCDate(t.getUTCDate() - day + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((t.getTime() - firstThursday.getTime()) / DAY_MS - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
