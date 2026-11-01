// Runs one pass of the chasing engine: plan, claim (so nothing is ever sent
// twice), send, record the result. Database and email are passed in, so the
// same code runs from the cron route and from the tests.

import { reminderEmail } from "./email";
import { planChase, type ChaseState, type PlannedReminder } from "./plan";

export type ChaseIO = {
  loadState(): Promise<ChaseState>;
  // Inserts the reminders that haven't happened before; returns those it
  // inserted (with their ids), matched by member and step.
  claim(reminders: PlannedReminder[]): Promise<{ id: string; member_id: string; step_key: string }[]>;
  finish(ids: string[], status: "sent" | "not_sent" | "failed", detail: string): Promise<void>;
  send(message: { to: string; cc: string[]; subject: string; text: string; html: string }): Promise<
    { sent: true; id: string } | { sent: false; reason: string }
  >;
};

export async function runChase(io: ChaseIO, appUrl: string, base: Date = new Date()) {
  const state = await io.loadState();
  const planned = planChase(state, base);
  if (!planned.length) return { planned: 0, claimed: 0, sent: 0, notSent: 0 };

  const claimed = await io.claim(planned);
  let sent = 0;
  let notSent = 0;
  for (const row of claimed) {
    const plan = planned.find((p) => p.member_id === row.member_id && p.step_key === row.step_key);
    if (!plan) continue;
    const message = reminderEmail(plan, appUrl);
    try {
      const result = await io.send({ to: plan.recipient_email, cc: plan.cc_emails, ...message });
      if (result.sent) {
        sent++;
        await io.finish([row.id], "sent", result.id);
      } else {
        notSent++;
        await io.finish([row.id], "not_sent", result.reason);
      }
    } catch (err) {
      notSent++;
      await io.finish([row.id], "failed", (err as Error).message);
    }
  }
  return { planned: planned.length, claimed: claimed.length, sent, notSent };
}

// The database side, for anything that can call our SQL functions.
export function stripContext(planned: PlannedReminder[]) {
  return planned.map((p) => {
    const row: Partial<PlannedReminder> = { ...p };
    delete row.context;
    return row;
  });
}
