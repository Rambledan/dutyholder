"use server";

import { revalidatePath } from "next/cache";
import { appUrl } from "@/lib/app-url";
import { requireAal2 } from "@/lib/auth/server";
import { reminderEmail } from "@/lib/chase/email";
import { sendEmail } from "@/lib/email";

export type DashboardResult = { error: string | null; message?: string };

export async function setChasingPaused(projectId: string, memberId: string, paused: boolean): Promise<DashboardResult> {
  const { supabase } = await requireAal2();
  const { data, error } = await supabase
    .from("project_members").update({ chasing_paused: paused }).eq("id", memberId).eq("project_id", projectId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only the project owner can change this." };
  revalidatePath(`/projects/${projectId}/dashboard`);
  return { error: null };
}

// "Chase now": a reminder from the owner, today, whatever the schedule says.
// Limited to once per person per day.
export async function chaseNow(projectId: string, memberId: string): Promise<DashboardResult> {
  const { supabase, userId } = await requireAal2();
  const { data: reminderId, error } = await supabase.rpc("record_manual_chase", { p_member_id: memberId });
  if (error || !reminderId) return { error: error?.message ?? "Couldn't chase." };

  const [{ data: member }, { data: project }, { data: items }, { data: me }] = await Promise.all([
    supabase.from("project_members").select("email, display_name, user_id").eq("id", memberId).maybeSingle(),
    supabase.from("projects").select("name, construction_start_date").eq("id", projectId).maybeSingle(),
    supabase.from("checklist_items").select("id, status, duty_templates(title)").eq("member_id", memberId).is("withdrawn_at", null),
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  const { data: profile } = member?.user_id
    ? await supabase.from("profiles").select("full_name").eq("id", member.user_id).maybeSingle()
    : { data: null };
  const open = (items ?? []).filter((i) => i.status !== "complete" && i.status !== "submitted");
  const done = (items ?? []).length - open.length;

  const message = reminderEmail(
    {
      project_id: projectId,
      member_id: memberId,
      recipient_email: member?.email ?? "",
      cc_emails: [],
      step_key: "manual",
      kind: "reminder",
      item_ids: open.map((i) => i.id),
      project_day: "",
      simulated: false,
      context: {
        projectName: project?.name ?? "",
        ownerName: me?.full_name || "the project owner",
        recipientName: profile?.full_name || member?.display_name || "",
        tasks: open.length
          ? open.map((i) => ({ title: i.duty_templates?.title ?? "Task", path: `/projects/${projectId}/tasks/${i.id}` }))
          : [{ title: "Your tasks", path: `/projects/${projectId}/tasks` }],
        done,
        total: (items ?? []).length,
        startDate: project?.construction_start_date ?? null,
      },
    },
    await appUrl(),
  );
  const result = member ? await sendEmail({ to: member.email, ...message }) : { sent: false as const, reason: "No email" };
  await supabase.rpc("finish_manual_chase", {
    p_reminder_id: reminderId,
    p_sent: result.sent,
    p_detail: result.sent ? result.id : result.reason,
  });

  revalidatePath(`/projects/${projectId}/dashboard`);
  return result.sent
    ? { error: null, message: "Reminder sent." }
    : { error: null, message: `Recorded, but not emailed: ${result.reason}.` };
}
