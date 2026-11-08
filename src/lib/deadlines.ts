// The statutory deadlines (PLAN.md, "Key deadlines"). The database works out
// each item's due date from its trigger event; this file says how each one
// is described, when it's waiting, and when it's chased. Pure, so the task
// list, dashboard, chasing engine and tests all agree.

export type Deadline = {
  // The length of the legal window, in calendar days.
  windowDays: number;
  // What starts the clock, for screens and emails.
  clock: string;
  // Gated items can't be done (or chased) until their clock starts. Null
  // means the item can be done at any time; the clock only adds a due date.
  waitingFor: string | null;
};

export const DEADLINES: Record<string, Deadline> = {
  "CL-11O-NOTIFY": {
    windowDays: 14,
    clock: "14 days from a principal appointment made after the building control application",
    waitingFor: null,
  },
  "PD-11M-HANDOVER": {
    windowDays: 28,
    clock: "28 days from the end of the principal designer's appointment",
    waitingFor: "when your appointment as principal designer ends. The project owner records the date.",
  },
  "PC-11N-HANDOVER": {
    windowDays: 28,
    clock: "28 days from the end of the principal contractor's appointment",
    waitingFor: "when your appointment as principal contractor ends. The project owner records the date.",
  },
  "CL-16-COMPLETION": {
    windowDays: 5,
    clock: "5 days from the building work being completed",
    waitingFor: "when the project owner marks the building work complete.",
  },
  "PD-16-COMPLETION": {
    windowDays: 5,
    clock: "5 days from the building work being completed",
    waitingFor: "when the project owner marks the building work complete.",
  },
  "PC-16-COMPLETION": {
    windowDays: 5,
    clock: "5 days from the building work being completed",
    waitingFor: "when the project owner marks the building work complete.",
  },
  "PC-16-OCCUPATION": {
    windowDays: 5,
    clock: "at least 5 days before any part of the building is occupied early",
    waitingFor: null,
  },
};

export const COMPLETION_CODES = ["CL-16-COMPLETION", "PD-16-COMPLETION", "PC-16-COMPLETION"];

export const isDeadline = (code: string) => code in DEADLINES;

// True while an item's clock hasn't started and it can't be done yet.
export function isWaiting(code: string, dueDate: string | null): boolean {
  return Boolean(DEADLINES[code]?.waitingFor) && !dueDate;
}

const DAY_MS = 86_400_000;

// Whole calendar days from `today` to `due` (both YYYY-MM-DD). Negative
// once overdue.
export function daysLeft(due: string, today: string): number {
  return Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

export function countdownLabel(days: number): string {
  if (days === 0) return "Due today";
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} left`;
  return `${-days} day${days === -1 ? "" : "s"} overdue`;
}

export function countdownTone(days: number, done: boolean): "green" | "amber" | "red" {
  if (done) return "green";
  if (days < 0 || days <= 2) return "red";
  return "amber";
}

// Legal-deadline chasing (on top of the usual sequence): every day for the
// short 5-day windows; otherwise 14, 7 and 2 days out and on the day. Once
// overdue, every day for a week, then the owner takes over.
export function deadlineReminderDue(windowDays: number, days: number): boolean {
  if (days < -7) return false;
  if (days < 0) return true;
  if (days > windowDays) return false;
  if (windowDays <= 5) return true;
  return [14, 7, 2, 0].includes(days);
}

export function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
