import "server-only";

// Sends email through Resend's HTTP API. Needs RESEND_API_KEY and EMAIL_FROM
// (e.g. "Dutyholder <invites@yourdomain.co.uk>", on a domain verified in
// Resend). Without them, nothing is sent and callers fall back to showing
// the link for the owner to copy.
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export type SendResult = { sent: true; id: string } | { sent: false; reason: string };

export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  if (!emailConfigured()) return { sent: false, reason: "Email sending is not set up yet" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) return { sent: false, reason: body.message ?? `Resend returned ${res.status}` };
    return { sent: true, id: body.id };
  } catch (err) {
    return { sent: false, reason: (err as Error).message };
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
