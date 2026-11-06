// Decides who gets which reminder. Pure: give it the state of the world and
// a moment in time, get back the reminders to send. No database, no email,
// so it can be tested with fixed dates. All "now" goes through projectNow.

import { daysBetween, isoWeek, isWorkingHours, londonParts, projectNow } from "@/lib/clock";
import { DEADLINES, daysLeft, deadlineReminderDue, isDeadline, isWaiting } from "@/lib/deadlines";

export type ChaseProject = {
  id: string;
  name: string;
  clock_offset_days: number;
  construction_start_date: string | null;
  work_completed_on?: string | null;
  is_demo?: boolean;
  demo_started_at?: string | null;
};
export type ChaseMember = {
  id: string;
  project_id: string;
  email: string;
  user_id: string | null;
  name: string;
  role: string | null;
  is_owner: boolean;
  chasing_paused: boolean;
  invited_at: string | null;
  started_at: string;
  // Set when a principal's appointment has ended: only their legal
  // deadlines (handover, completion statement) are chased after that.
  appointment_ended_on?: string | null;
};
export type ChaseItem = {
  id: string;
  project_id: string;
  member_id: string;
  code: string;
  status: string;
  title: string;
  item_type: string;
  due_date: string | null;
  legal_reference?: string;
};
export type ChaseState = {
  projects: ChaseProject[];
  members: ChaseMember[];
  items: ChaseItem[];
  appointments: { project_id: string; kind: string; status: string }[];
  pending_signatures: { appointment_id: string; member_id: string; party: string; kind: string; project_id: string }[];
  reminders: { member_id: string; project_id: string; step_key: string; kind: string; recipient_email: string; project_day: string }[];
};

export type Kind = "nudge" | "reminder" | "firm" | "owner_digest" | "deadline";

export type OpenTask = { title: string; path: string };

export type PlannedReminder = {
  project_id: string;
  member_id: string;
  recipient_email: string;
  cc_emails: string[];
  step_key: string;
  kind: Kind;
  item_ids: string[];
  project_day: string;
  simulated: boolean;
  // For writing the email (not stored).
  context: {
    projectName: string;
    ownerName: string;
    recipientName: string;
    tasks: OpenTask[];
    done: number;
    total: number;
    startDate: string | null;
    behind?: { name: string; open: number; days: number; paused: boolean }[];
    deadlines?: { title: string; legalReference: string; due: string; daysLeft: number }[];
  };
};

// The sequence from PLAN.md: day 3 nudge, day 7 reminder, day 14 firm, then
// firm again every 7 days. Day 10 is the owner's digest (weekly).
export const OWNER_DIGEST_DAY = 10;

export function dueStep(days: number): { kind: "nudge" | "reminder" | "firm"; day: number } | null {
  if (days >= 14) return { kind: "firm", day: 14 + Math.floor((days - 14) / 7) * 7 };
  if (days >= 7) return { kind: "reminder", day: 7 };
  if (days >= 3) return { kind: "nudge", day: 3 };
  return null;
}

const KIND_BY_CODE: Record<string, string> = {
  "CL-11D-APPOINT-PD": "pd_appointment",
  "CL-11D-APPOINT-PC": "pc_appointment",
  "DES-11D-LEAD": "lead_designer_agreement",
  "CL-11D-CDM": "cdm_certification",
};

const KIND_TITLES: Record<string, string> = {
  pd_appointment: "Sign the principal designer appointment",
  pc_appointment: "Sign the principal contractor appointment",
  lead_designer_agreement: "Sign the lead designer agreement",
  cdm_certification: "Sign the CDM certification",
};

// What this person could act on right now. Items waiting on someone else
// (a letter not yet issued, nothing yet to review) don't count.
export function openTasks(state: ChaseState, member: ChaseMember) {
  const mine = state.items.filter((i) => i.member_id === member.id);
  const done = mine.filter((i) => i.status === "complete" || i.status === "submitted").length;
  const tasks: (OpenTask & { id?: string })[] = [];

  for (const i of mine) {
    if (i.status === "complete" || i.status === "submitted") continue;
    // A legal clock that hasn't started yet: nothing to do.
    if (isWaiting(i.code, i.due_date)) continue;
    // Once a principal's appointment has ended, only their legal deadlines.
    if (member.appointment_ended_on && !isDeadline(i.code)) continue;
    if (i.item_type === "sign") {
      const kind = KIND_BY_CODE[i.code];
      const pending = state.pending_signatures.some(
        (s) => s.member_id === member.id && s.kind === kind && s.project_id === i.project_id,
      );
      if (!pending) continue;
    }
    if (i.item_type === "review") {
      const anythingToReview = state.items.some(
        (x) => x.project_id === i.project_id && x.code === "ALL-11F-COMPETENCE" && x.status === "submitted",
      );
      if (!anythingToReview) continue;
    }
    tasks.push({ id: i.id, title: i.title, path: `/projects/${i.project_id}/tasks/${i.id}` });
  }

  // Letters to sign as appointee have no checklist item of their own.
  for (const s of state.pending_signatures) {
    if (member.appointment_ended_on) break;
    if (s.member_id === member.id && s.party === "appointee") {
      tasks.push({ title: KIND_TITLES[s.kind] ?? "Sign an appointment", path: `/projects/${s.project_id}/appointments/${s.appointment_id}` });
    }
  }
  return { tasks, done, total: mine.length };
}

export function planChase(state: ChaseState, base: Date = new Date()): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  // One email per person per day: who has already been chased "today"
  // (in the relevant project's calendar), from earlier runs or this one.
  const chasedOn = new Set(state.reminders.map((r) => `${r.recipient_email}|${r.project_day}`));
  const hasStep = new Set(state.reminders.map((r) => `${r.member_id}|${r.step_key}`));

  for (const project of state.projects) {
    const now = projectNow(project, base);
    const { date: today, hour } = londonParts(now);
    const members = state.members.filter((m) => m.project_id === project.id);
    const owners = members.filter((m) => m.is_owner);
    const ownerName = owners[0]?.name ?? "the project team";

    // Legal deadlines first: these go out every day of the week (still
    // 8am to 6pm), to owners too, because the law doesn't wait for Monday.
    if (hour >= 8 && hour < 18) {
      for (const m of members) {
        if (!m.user_id && !m.invited_at) continue;
        if (m.chasing_paused) continue;
        const { tasks, done, total } = openTasks(state, m);
        const due = state.items
          .filter((i) => i.member_id === m.id && i.due_date && isDeadline(i.code)
            && i.status !== "complete" && i.status !== "submitted")
          .map((i) => ({ item: i, days: daysLeft(i.due_date!, today) }))
          .filter(({ item, days }) => deadlineReminderDue(DEADLINES[item.code].windowDays, days))
          .sort((a, b) => a.days - b.days);
        if (!due.length) continue;
        const stepKey = `deadline_${today}`;
        if (hasStep.has(`${m.id}|${stepKey}`)) continue;
        const dayKey = `${m.email}|${today}`;
        if (chasedOn.has(dayKey)) continue;
        chasedOn.add(dayKey);
        hasStep.add(`${m.id}|${stepKey}`);
        const dueIds = new Set(due.map((d) => d.item.id));
        planned.push({
          project_id: project.id,
          member_id: m.id,
          recipient_email: m.email,
          cc_emails: owners.map((o) => o.email).filter((e) => e !== m.email),
          step_key: stepKey,
          kind: "deadline",
          item_ids: tasks.map((t) => t.id).filter((x): x is string => Boolean(x)),
          project_day: today,
          simulated: false,
          context: {
            projectName: project.name,
            ownerName,
            recipientName: m.name,
            // Deadline tasks first, then anything else outstanding.
            tasks: [...tasks.filter((t) => t.id && dueIds.has(t.id)), ...tasks.filter((t) => !t.id || !dueIds.has(t.id))],
            done,
            total,
            startDate: project.construction_start_date,
            deadlines: due.map(({ item, days }) => ({
              title: item.title, legalReference: item.legal_reference ?? "", due: item.due_date!, daysLeft: days,
            })),
          },
        });
      }
    }

    if (!isWorkingHours(now)) continue;

    const behind: NonNullable<PlannedReminder["context"]["behind"]> = [];

    for (const m of members) {
      if (m.is_owner) continue; // owners run the process; they get the digest instead
      if (!m.user_id && !m.invited_at) continue; // never invited: nothing to chase yet
      const { tasks, done, total } = openTasks(state, m);
      if (!tasks.length) continue;
      const days = daysBetween(new Date(m.started_at), now);
      if (days >= OWNER_DIGEST_DAY) behind.push({ name: m.name, open: tasks.length, days, paused: m.chasing_paused });
      if (m.chasing_paused) continue;

      const step = dueStep(days);
      if (!step) continue;
      const stepKey = `${step.kind}_${step.day}`;
      if (hasStep.has(`${m.id}|${stepKey}`)) continue;
      const dayKey = `${m.email}|${today}`;
      if (chasedOn.has(dayKey)) continue;

      chasedOn.add(dayKey);
      hasStep.add(`${m.id}|${stepKey}`);
      planned.push({
        project_id: project.id,
        member_id: m.id,
        recipient_email: m.email,
        cc_emails: step.kind === "firm" ? owners.map((o) => o.email).filter((e) => e !== m.email) : [],
        step_key: stepKey,
        kind: step.kind,
        item_ids: tasks.map((t) => t.id).filter((x): x is string => Boolean(x)),
        project_day: today,
        simulated: false,
        context: {
          projectName: project.name,
          ownerName,
          recipientName: m.name,
          tasks,
          done,
          total,
          startDate: project.construction_start_date,
        },
      });
    }

    // The owner's weekly "these people are behind" digest.
    if (behind.length) {
      const stepKey = `owner_digest_${isoWeek(now)}`;
      for (const o of owners) {
        if (hasStep.has(`${o.id}|${stepKey}`)) continue;
        const dayKey = `${o.email}|${today}`;
        if (chasedOn.has(dayKey)) continue;
        chasedOn.add(dayKey);
        hasStep.add(`${o.id}|${stepKey}`);
        planned.push({
          project_id: project.id,
          member_id: o.id,
          recipient_email: o.email,
          cc_emails: [],
          step_key: stepKey,
          kind: "owner_digest",
          item_ids: [],
          project_day: today,
          simulated: false,
          context: {
            projectName: project.name,
            ownerName,
            recipientName: o.name,
            tasks: [{ title: "Open the project dashboard", path: `/projects/${project.id}/dashboard` }],
            done: 0,
            total: 0,
            startDate: project.construction_start_date,
            behind,
          },
        });
      }
    }
  }
  return planned;
}

// For the dashboard: when this person's next automatic reminder is due,
// ignoring quiet hours and the once-a-day rule.
export function nextChase(state: ChaseState, member: ChaseMember, base: Date = new Date()) {
  const project = state.projects.find((p) => p.id === member.project_id);
  if (!project) return null;
  if (!member.user_id && !member.invited_at) return { label: "Not invited yet" };
  if (member.chasing_paused) return { label: "Paused" };
  if (!openTasks(state, member).tasks.length) return member.is_owner ? null : { label: "Nothing outstanding" };

  // A legal deadline outranks the usual sequence.
  const deadline = state.items
    .filter((i) => i.member_id === member.id && i.due_date && isDeadline(i.code)
      && i.status !== "complete" && i.status !== "submitted")
    .sort((x, y) => x.due_date!.localeCompare(y.due_date!))[0];
  if (deadline) return { label: `Legal deadline: ${deadline.title}`, when: new Date(`${deadline.due_date}T12:00:00Z`) };
  if (member.is_owner || member.appointment_ended_on) return null;

  const now = projectNow(project, base);
  const days = daysBetween(new Date(member.started_at), now);
  const sent = new Set(state.reminders.filter((r) => r.member_id === member.id).map((r) => r.step_key));
  for (let d = Math.max(days, 0); d <= days + 60; d++) {
    const step = dueStep(d);
    if (step && !sent.has(`${step.kind}_${step.day}`)) {
      const when = new Date(new Date(member.started_at).getTime() + step.day * 86_400_000);
      return { label: `${step.kind === "nudge" ? "Nudge" : step.kind === "reminder" ? "Reminder" : "Firm reminder"} on day ${step.day}`, when };
    }
  }
  return null;
}
