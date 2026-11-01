import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl } from "@/lib/app-url";
import { escapeHtml, sendEmail } from "@/lib/email";
import type { Database } from "@/lib/supabase/database.types";

// A short notification email ("X needs more information", "please sign"),
// sent on behalf of the person who triggered it, and logged in the audit
// trail whether or not email is set up.
export async function notifyMember(
  supabase: SupabaseClient<Database>,
  p: {
    projectId: string;
    memberId: string;
    to: string;
    kind: string;
    subject: string;
    lines: string[];
    path: string;
    button: string;
    fromName: string;
  },
) {
  const link = `${await appUrl()}${p.path}`;
  const text = [...p.lines, "", link, "", `Sent on behalf of ${p.fromName}.`].join("\n");
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5;color:#171717;max-width:560px">
    ${p.lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}
    <p style="margin:24px 0">
      <a href="${escapeHtml(link)}" style="background:#171717;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(p.button)}</a>
    </p>
    <p style="font-size:13px;color:#525252">Sent on behalf of ${escapeHtml(p.fromName)}.</p>
  </div>`;

  const result = await sendEmail({ to: p.to, subject: p.subject, text, html });
  await supabase.rpc("record_email", {
    p_project_id: p.projectId,
    p_member_id: p.memberId,
    p_kind: p.kind,
    p_sent: result.sent,
    p_detail: result.sent ? result.id : result.reason,
  });
  return result;
}
