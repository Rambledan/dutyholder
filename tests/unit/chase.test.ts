import { describe, expect, it } from "vitest";
import { daysBetween, isoWeek, isWorkingHours, projectNow } from "@/lib/clock";
import { dueStep, nextChase, planChase, type ChaseState } from "@/lib/chase/plan";
import { reminderEmail } from "@/lib/chase/email";

// Tuesday 3 November 2026, 10:00 UK time (GMT).
const TUE_10AM = new Date("2026-11-03T10:00:00Z");
const daysAgo = (n: number, from = TUE_10AM) => new Date(from.getTime() - n * 86_400_000).toISOString();

function state(overrides: { invitedDaysAgo?: number; paused?: boolean; status?: string; reminders?: ChaseState["reminders"] } = {}): ChaseState {
  const started = daysAgo(overrides.invitedDaysAgo ?? 8);
  return {
    projects: [{ id: "p1", name: "Mill Lane", clock_offset_days: 0, construction_start_date: "2027-01-11" }],
    members: [
      { id: "owner", project_id: "p1", email: "owner@x.test", user_id: "u0", name: "Olivia Owner", role: "principal_designer",
        is_owner: true, chasing_paused: false, invited_at: null, started_at: daysAgo(30) },
      { id: "sam", project_id: "p1", email: "sam@x.test", user_id: "u1", name: "Sam Structures", role: "designer",
        is_owner: false, chasing_paused: overrides.paused ?? false, invited_at: started, started_at: started },
    ],
    items: [
      { id: "i1", project_id: "p1", member_id: "sam", code: "ALL-11J-GENERAL", status: overrides.status ?? "not_started",
        title: "Plan, manage and monitor", item_type: "acknowledge", due_date: null },
      { id: "i2", project_id: "p1", member_id: "sam", code: "ALL-11F-COMPETENCE", status: "complete",
        title: "Competence", item_type: "form", due_date: null },
    ],
    appointments: [],
    pending_signatures: [],
    reminders: overrides.reminders ?? [],
  };
}

describe("project clock", () => {
  it("adds the project's offset to real time", () => {
    expect(projectNow({ clock_offset_days: 0 }, TUE_10AM)).toEqual(TUE_10AM);
    expect(projectNow({ clock_offset_days: 7 }, TUE_10AM).toISOString()).toBe("2026-11-10T10:00:00.000Z");
  });

  it("only allows weekdays, 8am to 6pm UK time", () => {
    expect(isWorkingHours(TUE_10AM)).toBe(true);
    expect(isWorkingHours(new Date("2026-11-03T07:59:00Z"))).toBe(false);
    expect(isWorkingHours(new Date("2026-11-03T18:00:00Z"))).toBe(false);
    expect(isWorkingHours(new Date("2026-11-07T10:00:00Z"))).toBe(false); // Saturday
    // British Summer Time: 07:30 UTC is 08:30 in London.
    expect(isWorkingHours(new Date("2026-06-02T07:30:00Z"))).toBe(true);
  });

  it("counts whole days and ISO weeks", () => {
    expect(daysBetween(new Date(daysAgo(8)), TUE_10AM)).toBe(8);
    expect(isoWeek(new Date("2026-11-01T12:00:00Z"))).toBe("2026-W44"); // Sunday
    expect(isoWeek(new Date("2026-11-02T12:00:00Z"))).toBe("2026-W45"); // Monday
  });
});

describe("the reminder sequence", () => {
  it("is day 3 nudge, day 7 reminder, day 14 firm, then firm weekly", () => {
    expect(dueStep(2)).toBeNull();
    expect(dueStep(3)).toEqual({ kind: "nudge", day: 3 });
    expect(dueStep(9)).toEqual({ kind: "reminder", day: 7 });
    expect(dueStep(14)).toEqual({ kind: "firm", day: 14 });
    expect(dueStep(20)).toEqual({ kind: "firm", day: 14 });
    expect(dueStep(21)).toEqual({ kind: "firm", day: 21 });
  });
});

describe("planChase", () => {
  it("sends the latest due step only, never a backlog", () => {
    const plan = planChase(state({ invitedDaysAgo: 8 }), TUE_10AM);
    expect(plan.map((p) => p.step_key)).toEqual(["reminder_7"]);
    expect(plan[0].recipient_email).toBe("sam@x.test");
    expect(plan[0].item_ids).toEqual(["i1"]);
  });

  it("never repeats a step that has already been recorded", () => {
    const reminders = [{ member_id: "sam", project_id: "p1", step_key: "reminder_7", kind: "reminder",
      recipient_email: "sam@x.test", project_day: "2026-11-02" }];
    expect(planChase(state({ reminders }), TUE_10AM)).toEqual([]);
  });

  it("sends at most one email per person per day", () => {
    const reminders = [{ member_id: "sam", project_id: "p1", step_key: "manual_2026-11-03", kind: "manual",
      recipient_email: "sam@x.test", project_day: "2026-11-03" }];
    expect(planChase(state({ reminders }), TUE_10AM)).toEqual([]);
  });

  it("respects quiet hours, weekends, pauses and finished work", () => {
    expect(planChase(state(), new Date("2026-11-07T10:00:00Z"))).toEqual([]);
    expect(planChase(state(), new Date("2026-11-03T20:00:00Z"))).toEqual([]);
    expect(planChase(state({ paused: true }), TUE_10AM)).toEqual([]);
    expect(planChase(state({ status: "complete" }), TUE_10AM)).toEqual([]);
    expect(planChase(state({ invitedDaysAgo: 2 }), TUE_10AM)).toEqual([]);
  });

  it("copies the owner on the firm reminder and sends the owner a weekly digest", () => {
    const plan = planChase(state({ invitedDaysAgo: 15 }), TUE_10AM);
    const firm = plan.find((p) => p.kind === "firm")!;
    expect(firm.step_key).toBe("firm_14");
    expect(firm.cc_emails).toEqual(["owner@x.test"]);
    const digest = plan.find((p) => p.kind === "owner_digest")!;
    expect(digest.recipient_email).toBe("owner@x.test");
    expect(digest.step_key).toBe("owner_digest_2026-W45");
    expect(digest.context.behind?.[0]).toMatchObject({ name: "Sam Structures", open: 1, days: 15 });
  });

  it("follows the project clock, so a demo project can fast-forward", () => {
    const s = state({ invitedDaysAgo: 1 });
    expect(planChase(s, TUE_10AM)).toEqual([]);
    s.projects[0].clock_offset_days = 7; // the project's now is a week later
    expect(planChase(s, TUE_10AM).map((p) => p.step_key)).toEqual(["reminder_7"]);
  });

  it("doesn't chase for letters that haven't been issued yet", () => {
    const s = state();
    s.items = [{ id: "i9", project_id: "p1", member_id: "sam", code: "DES-11D-LEAD", status: "not_started",
      title: "Lead designer agreement", item_type: "sign", due_date: null }];
    expect(planChase(s, TUE_10AM)).toEqual([]);
    s.pending_signatures = [{ appointment_id: "a1", member_id: "sam", party: "designer", kind: "lead_designer_agreement", project_id: "p1" }];
    expect(planChase(s, TUE_10AM)).toHaveLength(1);
  });

  it("previews the next reminder for the dashboard", () => {
    const s = state({ invitedDaysAgo: 1 });
    expect(nextChase(s, s.members[1], TUE_10AM)?.label).toBe("Nudge on day 3");
    const paused = state({ paused: true });
    expect(nextChase(paused, paused.members[1], TUE_10AM)?.label).toBe("Paused");
  });
});

describe("reminder emails", () => {
  it("are sent on behalf of the owner, show progress and link to each task", () => {
    const [r] = planChase(state(), TUE_10AM);
    const email = reminderEmail(r, "https://dutyholder.vercel.app");
    expect(email.subject).toContain("Mill Lane");
    expect(email.text).toContain("You've done 1 of 2.");
    expect(email.text).toContain("11 January 2027");
    expect(email.text).toContain("https://dutyholder.vercel.app/projects/p1/tasks/i1");
    expect(email.text).toContain("on behalf of Olivia Owner");
  });
});
