// Phase 8: legal-deadline chasing. Runs every day of the week (still 8am to
// 6pm), reaches owners and former principals, and leaves clocks that haven't
// started alone.
import { describe, expect, it } from "vitest";
import { nextChase, openTasks, planChase, type ChaseItem, type ChaseState } from "@/lib/chase/plan";
import { reminderEmail } from "@/lib/chase/email";
import { countdownLabel, daysLeft, deadlineReminderDue, isWaiting } from "@/lib/deadlines";

// Saturday 7 November 2026, 10:00 UK time (GMT).
const SAT_10AM = new Date("2026-11-07T10:00:00Z");

function state(items: ChaseItem[], ended: string | null = null): ChaseState {
  return {
    projects: [{ id: "p1", name: "Mill Lane", clock_offset_days: 0, construction_start_date: null }],
    members: [
      { id: "owner", project_id: "p1", email: "owner@x.test", user_id: "u0", name: "Olivia Owner", role: "principal_designer",
        is_owner: true, chasing_paused: false, invited_at: null, started_at: "2026-10-01T09:00:00Z", appointment_ended_on: ended },
      { id: "chris", project_id: "p1", email: "chris@x.test", user_id: "u1", name: "Chris Client", role: "client",
        is_owner: false, chasing_paused: false, invited_at: "2026-11-06T09:00:00Z", started_at: "2026-11-06T09:00:00Z" },
    ],
    items,
    appointments: [],
    pending_signatures: [],
    reminders: [],
  };
}

const item = (over: Partial<ChaseItem>): ChaseItem => ({
  id: "i", project_id: "p1", member_id: "chris", code: "CL-16-COMPLETION", status: "not_started",
  title: "Sign your completion statement", item_type: "acknowledge", due_date: null, legal_reference: "Reg 16(4A)", ...over,
});

describe("deadline helpers", () => {
  it("counts calendar days and labels them", () => {
    expect(daysLeft("2026-11-12", "2026-11-07")).toBe(5);
    expect(daysLeft("2026-11-05", "2026-11-07")).toBe(-2);
    expect(countdownLabel(0)).toBe("Due today");
    expect(countdownLabel(1)).toBe("1 day left");
    expect(countdownLabel(-3)).toBe("3 days overdue");
  });

  it("chases 5-day windows daily, and 28-day windows at 14, 7, 2 and 0 days", () => {
    expect([5, 4, 3, 2, 1, 0].every((d) => deadlineReminderDue(5, d))).toBe(true);
    expect([14, 7, 2, 0].every((d) => deadlineReminderDue(28, d))).toBe(true);
    expect([27, 20, 13, 5, 1].some((d) => deadlineReminderDue(28, d))).toBe(false);
    expect(deadlineReminderDue(28, -1)).toBe(true);
    expect(deadlineReminderDue(28, -8)).toBe(false);
  });

  it("treats handovers and completion statements as waiting until their clock starts", () => {
    expect(isWaiting("PD-11M-HANDOVER", null)).toBe(true);
    expect(isWaiting("PD-11M-HANDOVER", "2026-12-01")).toBe(false);
    expect(isWaiting("CL-11O-NOTIFY", null)).toBe(false);
    expect(isWaiting("ALL-11J-GENERAL", null)).toBe(false);
  });
});

describe("legal-deadline chasing", () => {
  it("chases a completion statement on a Saturday, copying the owner", () => {
    const planned = planChase(state([item({ due_date: "2026-11-11" })]), SAT_10AM);
    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({ member_id: "chris", kind: "deadline", step_key: "deadline_2026-11-07", cc_emails: ["owner@x.test"] });
    const email = reminderEmail(planned[0], "https://app.test");
    expect(email.subject).toBe("Legal deadline 11 November 2026: Mill Lane");
    expect(email.text).toContain("Sign your completion statement (Reg 16(4A)): due 11 November 2026, in 4 days");
  });

  it("doesn't chase it once a day's reminder is recorded, outside 8am–6pm, or before the clock starts", () => {
    const s = state([item({ due_date: "2026-11-11" })]);
    s.reminders = [{ member_id: "chris", project_id: "p1", step_key: "deadline_2026-11-07", kind: "deadline",
      recipient_email: "chris@x.test", project_day: "2026-11-07" }];
    expect(planChase(s, SAT_10AM)).toHaveLength(0);
    expect(planChase(state([item({ due_date: "2026-11-11" })]), new Date("2026-11-07T19:00:00Z"))).toHaveLength(0);
    expect(planChase(state([item({ due_date: null })]), SAT_10AM)).toHaveLength(0);
  });

  it("reaches the owner for their own handover, and a waiting handover isn't an open task", () => {
    const waiting = state([item({ id: "h", member_id: "owner", code: "PD-11M-HANDOVER", item_type: "form", due_date: null })]);
    expect(openTasks(waiting, waiting.members[0]).tasks).toHaveLength(0);

    // Appointment ended 14 days before its 28-day deadline.
    const s = state([item({ id: "h", member_id: "owner", code: "PD-11M-HANDOVER", item_type: "form", title: "Give the client your handover document",
      legal_reference: "Reg 11M(5)(b)", due_date: "2026-11-21" })], "2026-10-24");
    const planned = planChase(s, SAT_10AM);
    expect(planned.map((p) => [p.member_id, p.kind])).toEqual([["owner", "deadline"]]);
    expect(planned[0].cc_emails).toEqual([]);
  });

  it("after a principal's appointment ends, only chases their legal deadlines", () => {
    const s = state([
      item({ id: "ack", member_id: "owner", code: "PD-11M-ACK", title: "Acknowledge", due_date: null }),
      item({ id: "st", member_id: "owner", code: "PD-16-COMPLETION", due_date: "2026-11-10" }),
    ], "2026-10-01");
    expect(openTasks(s, s.members[0]).tasks.map((t) => t.id)).toEqual(["st"]);
    expect(nextChase(s, s.members[0], SAT_10AM)?.label).toBe("Legal deadline: Sign your completion statement");
  });
});
