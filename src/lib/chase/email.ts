// The wording of each chase. Polite, sent on behalf of the project owner,
// one click from each task. Pure, so it can be previewed and tested.

import type { PlannedReminder } from "./plan";

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function reminderEmail(r: PlannedReminder, appUrl: string) {
  const c = r.context;
  const first = c.recipientName.split(" ")[0] || "there";
  const progress = c.total ? `You've done ${c.done} of ${c.total}.` : "";
  const link = (path: string) => `${appUrl}${path}`;
  let subject: string;
  let intro: string[];

  switch (r.kind) {
    case "nudge":
      subject = `A quick reminder: ${c.projectName}`;
      intro = [
        `Hi ${first},`,
        `A friendly nudge about your Building Regulations dutyholder tasks for ${c.projectName}. ${progress} Here's what's left:`,
      ];
      break;
    case "reminder":
      subject = `Reminder: your dutyholder tasks for ${c.projectName}`;
      intro = [
        `Hi ${first},`,
        `${progress} These are still outstanding for ${c.projectName}${
          c.startDate ? `, and construction is due to start on ${longDate(c.startDate)}` : ""
        }:`,
      ];
      break;
    case "firm":
      subject = `Action needed before work starts: ${c.projectName}`;
      intro = [
        `Hi ${first},`,
        `Your dutyholder tasks for ${c.projectName} are still outstanding. Under regulation 11E, whoever appointed you must be satisfied you are competent before your work starts, so these need completing. ${progress}`,
      ];
      break;
    case "deadline": {
      const d = c.deadlines ?? [];
      const soonest = d[0];
      subject = soonest && soonest.daysLeft < 0
        ? `Overdue: ${soonest.title} (${c.projectName})`
        : `Legal deadline${soonest ? ` ${longDate(soonest.due)}` : ""}: ${c.projectName}`;
      intro = [
        `Hi ${first},`,
        `${d.length === 1 ? "This has" : "These have"} a deadline set by the Building Regulations on ${c.projectName}:`,
        ...d.map((x) => `• ${x.title} (${x.legalReference}): ${x.daysLeft < 0
          ? `was due ${longDate(x.due)}, ${-x.daysLeft} day${x.daysLeft === -1 ? "" : "s"} ago`
          : x.daysLeft === 0 ? "due today" : `due ${longDate(x.due)}, in ${x.daysLeft} day${x.daysLeft === 1 ? "" : "s"}`}`),
        "Because the date is set in law, these reminders can arrive on any day of the week.",
      ];
      break;
    }
    case "owner_digest":
      subject = `${c.behind?.length ?? 0} ${c.behind?.length === 1 ? "person is" : "people are"} behind on ${c.projectName}`;
      intro = [
        `Hi ${first},`,
        `These people have had outstanding tasks on ${c.projectName} for 10 days or more:`,
        ...(c.behind ?? []).map(
          (b) => `• ${b.name}: ${b.open} open, invited ${b.days} days ago${b.paused ? " (chasing paused)" : ""}`,
        ),
        "From the dashboard you can chase them again, pause reminders, or note that you'll call them.",
      ];
      break;
  }

  const footer =
    r.kind === "owner_digest"
      ? "Sent by Dutyholder."
      : `Sent on behalf of ${c.ownerName}. If you have questions, reply to them directly.`;

  const text = [...intro, "", ...c.tasks.map((t) => `- ${t.title}: ${link(t.path)}`), "", footer].join("\n");
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5;color:#171717;max-width:560px">
    ${intro.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("")}
    <ul style="padding-left:20px">
      ${c.tasks.map((t) => `<li style="margin-bottom:6px"><a href="${esc(link(t.path))}">${esc(t.title)}</a></li>`).join("")}
    </ul>
    <p style="font-size:13px;color:#525252">${esc(footer)}</p>
  </div>`;
  return { subject, text, html };
}
