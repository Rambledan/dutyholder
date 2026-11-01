import "server-only";
import { escapeHtml } from "@/lib/email";
import { roleLabel, type DutyholderRole } from "@/lib/labels";

// The invite email: polite, sent on behalf of the project owner, and clear
// about why it's a legal duty and how long it takes.
export function inviteEmail(p: { ownerName: string; projectName: string; role: DutyholderRole | null; link: string }) {
  const role = roleLabel(p.role).toLowerCase();
  const subject = `${p.ownerName} has invited you to ${p.projectName}`;
  const text = [
    `Hello,`,
    ``,
    `${p.ownerName} has added you to "${p.projectName}" as the ${role}.`,
    ``,
    `Under Part 2A of the Building Regulations 2010, everyone who designs or builds on a project has duties to`,
    `acknowledge and must show they are competent for their work. This app records that in one place.`,
    `It takes about 15 minutes, and you can stop and come back: your answers save as you go.`,
    ``,
    `Start here (the link works once and expires in 7 days):`,
    p.link,
    ``,
    `You'll set a password and turn on two-factor login with an authenticator app on your phone.`,
    ``,
    `Sent on behalf of ${p.ownerName}.`,
  ].join("\n");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5;color:#171717;max-width:560px">
    <p>Hello,</p>
    <p><strong>${escapeHtml(p.ownerName)}</strong> has added you to <strong>${escapeHtml(p.projectName)}</strong> as the ${escapeHtml(role)}.</p>
    <p>Under Part 2A of the Building Regulations 2010, everyone who designs or builds on a project has duties to acknowledge
       and must show they are competent for their work. This app records that in one place.</p>
    <p>It takes about <strong>15 minutes</strong>, and you can stop and come back: your answers save as you go.</p>
    <p style="margin:28px 0">
      <a href="${escapeHtml(p.link)}" style="background:#171717;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Accept invite</a>
    </p>
    <p style="font-size:13px;color:#525252">The link works once and expires in 7 days. You'll set a password and turn on
       two-factor login with an authenticator app on your phone.</p>
    <p style="font-size:13px;color:#525252">Sent on behalf of ${escapeHtml(p.ownerName)}.</p>
  </div>`;
  return { subject, text, html };
}
