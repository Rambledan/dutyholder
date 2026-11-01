// The demo's fictional people and what they do each simulated day. Pure:
// it plans the day's emails with the real chasing planner, then lets each
// persona act, and returns the changes for demo_step() to apply.
//
// Personas (PLAN.md, phase 6):
//   client      prompt; signs on day 2; reviews submissions the next day
//   pd          quick: everything on day 1
//   structural  everything on day 2
//   fire        only responds the day after their second reminder
//   mep         submits on day 4; is asked for more info once; resubmits two days later
//   pc          waits for the first nudge, then does everything the next day

import { reminderEmail } from "@/lib/chase/email";
import { planChase, type ChaseItem, type ChaseMember, type ChaseProject, type ChaseState } from "@/lib/chase/plan";
import { isWorkingHours, londonParts, projectNow } from "@/lib/clock";

export type DemoMember = ChaseMember & { demo_persona: string | null };

export type DemoState = {
  history?: { day: number; date: string; complete: number; total: number }[];
  submittedOn?: Record<string, number>; // item id -> day submitted
  needsInfoOn?: Record<string, number>; // item id -> day sent back
  mepAskedOnce?: boolean;
  readyOn?: Record<string, number>; // persona -> day they'll act
};

export type DemoSnapshot = {
  project: ChaseProject & { demo_state: DemoState };
  members: DemoMember[];
  items: ChaseItem[];
  reminders: ChaseState["reminders"];
};

export type DemoDay = {
  day: number;
  date: string;
  changes: { item_id: string; status: string }[];
  emails: {
    member_id: string;
    recipient_email: string;
    cc_emails: string[];
    step_key: string;
    kind: string;
    item_ids: string[];
    project_day: string;
    subject: string;
    body_text: string;
  }[];
  state: DemoState;
  allGreen: boolean;
  events: string[]; // plain-English log of what happened
};

const DONE = new Set(["complete"]);

export function planDemoDay(snap: DemoSnapshot, appUrl: string): DemoDay {
  const day = snap.project.clock_offset_days + 1;
  const project = { ...snap.project, clock_offset_days: day };
  const now = projectNow(project);
  const date = londonParts(now).date;
  const state: DemoState = structuredClone(snap.project.demo_state ?? {});
  state.submittedOn ??= {};
  state.needsInfoOn ??= {};
  state.readyOn ??= {};
  const events: string[] = [];

  // 1. Morning: the real chasing planner decides who gets an email.
  const chaseState: ChaseState = {
    projects: [project],
    members: snap.members,
    items: snap.items,
    appointments: [],
    pending_signatures: [],
    reminders: snap.reminders,
  };
  const planned = planChase(chaseState, now);
  const emails = planned.map((p) => {
    const message = reminderEmail(p, appUrl);
    events.push(`Email to ${p.context.recipientName}: ${message.subject}`);
    return {
      member_id: p.member_id,
      recipient_email: p.recipient_email,
      cc_emails: p.cc_emails,
      step_key: p.step_key,
      kind: p.kind,
      item_ids: p.item_ids,
      project_day: p.project_day,
      subject: message.subject,
      body_text: message.text,
    };
  });

  // 2. During the day: each fictional person acts on their script.
  const status = new Map(snap.items.map((i) => [i.id, i.status]));
  const changes: DemoDay["changes"] = [];
  const set = (item: ChaseItem, to: string) => {
    if (status.get(item.id) === to) return;
    status.set(item.id, to);
    changes.push({ item_id: item.id, status: to });
  };
  const remindersFor = (memberId: string) =>
    snap.reminders.filter((r) => r.member_id === memberId).length + emails.filter((e) => e.member_id === memberId).length;
  const byPersona = (persona: string) => snap.members.find((m) => m.demo_persona === persona);
  const itemsOf = (member: DemoMember) => snap.items.filter((i) => i.member_id === member.id);

  // Do everything except the things that wait on someone else.
  const doMyTasks = (member: DemoMember, includeSigning: boolean) => {
    let did = 0;
    for (const item of itemsOf(member)) {
      const s = status.get(item.id)!;
      if (DONE.has(s) || s === "submitted") continue;
      if (item.item_type === "review") continue; // ticks itself off once reviews are done
      if (item.item_type === "sign" && !includeSigning) continue;
      if (item.code === "ALL-11F-COMPETENCE") {
        if (s === "needs_info") continue; // handled by the persona's own script
        set(item, "submitted");
        state.submittedOn![item.id] = day;
      } else {
        set(item, "complete");
      }
      did++;
    }
    if (did) events.push(`${member.name} completed ${did} task${did === 1 ? "" : "s"}`);
  };

  // People don't work at weekends either.
  if (isWorkingHours(now)) {
    const client = byPersona("client");
    if (client && day >= 1) doMyTasks(client, day >= 2);

    const pd = byPersona("pd");
    if (pd && day >= 1) doMyTasks(pd, true);

    const structural = byPersona("structural");
    if (structural && day >= 2) doMyTasks(structural, true);

    const fire = byPersona("fire");
    if (fire) {
      if (state.readyOn!.fire === undefined && remindersFor(fire.id) >= 2) {
        state.readyOn!.fire = day + 1;
        events.push(`${fire.name} has had a second reminder and will reply tomorrow`);
      }
      if (state.readyOn!.fire !== undefined && day >= state.readyOn!.fire) doMyTasks(fire, true);
    }

    const pc = byPersona("pc");
    if (pc) {
      if (state.readyOn!.pc === undefined && remindersFor(pc.id) >= 1) state.readyOn!.pc = day + 1;
      if (state.readyOn!.pc !== undefined && day >= state.readyOn!.pc) doMyTasks(pc, true);
    }

    const mep = byPersona("mep");
    if (mep) {
      if (day >= 4) doMyTasks(mep, true);
      for (const item of itemsOf(mep)) {
        const sentBack = state.needsInfoOn![item.id];
        if (status.get(item.id) === "needs_info" && sentBack !== undefined && day >= sentBack + 2) {
          set(item, "submitted");
          state.submittedOn![item.id] = day;
          events.push(`${mep.name} added the missing information and resubmitted`);
        }
      }
    }

    // The client reviews anything submitted before today.
    if (client) {
      for (const item of snap.items.filter((i) => i.code === "ALL-11F-COMPETENCE")) {
        const submitted = state.submittedOn![item.id];
        if (status.get(item.id) !== "submitted" || submitted === undefined || submitted >= day) continue;
        const who = snap.members.find((m) => m.id === item.member_id);
        if (who?.demo_persona === "mep" && !state.mepAskedOnce) {
          set(item, "needs_info");
          state.needsInfoOn![item.id] = day;
          state.mepAskedOnce = true;
          events.push(`${client.name} asked ${who.name} for more information`);
        } else {
          set(item, "complete");
          events.push(`${client.name} was satisfied with ${who ? `${who.name}'s` : "a"} competence statement`);
        }
      }
    }
  }

  // Review items tick themselves off in the database once everyone is
  // satisfied; count them as done here when that will happen.
  const reviewsDone = snap.items
    .filter((i) => i.code === "ALL-11F-COMPETENCE")
    .every((i) => status.get(i.id) === "complete");
  const complete = snap.items.filter(
    (i) => status.get(i.id) === "complete" || (i.item_type === "review" && reviewsDone),
  ).length;
  state.history = [...(state.history ?? []), { day, date, complete, total: snap.items.length }];

  return { day, date, changes, emails, state, allGreen: complete === snap.items.length, events };
}
