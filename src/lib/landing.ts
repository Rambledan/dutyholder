// The time-saved figures on the landing page. They are estimates for one
// dutyholder on a typical project, in minutes of the project owner's time,
// comparing email-and-spreadsheet working with Dutyholder. Kept here so the
// page and the calculator always agree.

export type TimeTask = { task: string; detail: string; manual: number; withApp: number };

export const TIME_TASKS: TimeTask[] = [
  {
    task: "Appointment letters",
    detail: "Drafting, sending and getting the client and appointee to sign",
    manual: 60, withApp: 10,
  },
  {
    task: "Chasing",
    detail: "Emails and calls until every acknowledgement and signature is in",
    manual: 150, withApp: 10,
  },
  {
    task: "Competence checks",
    detail: "Collecting CVs, memberships and insurance, then recording your decision",
    manual: 90, withApp: 30,
  },
  {
    task: "Keeping track",
    detail: "Updating the spreadsheet of who has done what",
    manual: 45, withApp: 5,
  },
  {
    task: "Evidence pack",
    detail: "Filing everything for building control, with an audit trail",
    manual: 60, withApp: 5,
  },
];

export const MANUAL_MINUTES = TIME_TASKS.reduce((n, t) => n + t.manual, 0);
export const APP_MINUTES = TIME_TASKS.reduce((n, t) => n + t.withApp, 0);
export const SAVED_MINUTES_PER_PERSON = MANUAL_MINUTES - APP_MINUTES;

// Owner hours saved in a year across every project.
export function hoursSaved(people: number, projectsPerYear: number): number {
  return (SAVED_MINUTES_PER_PERSON * people * projectsPerYear) / 60;
}

// "5h 45m", "40m", "2h"
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
