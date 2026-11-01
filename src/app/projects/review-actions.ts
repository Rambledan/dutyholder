"use server";

import { revalidatePath } from "next/cache";
import { requireAal2 } from "@/lib/auth/server";
import { notifyMember } from "@/lib/notify";

export type ReviewResult = { error: string | null };

async function myName(userId: string, supabase: Awaited<ReturnType<typeof requireAal2>>["supabase"]) {
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return data?.full_name || "The project team";
}

export async function reviewCompetence(
  projectId: string,
  itemId: string,
  decision: "satisfied" | "needs_info",
  note: string,
): Promise<ReviewResult> {
  const { supabase, userId } = await requireAal2();
  const { error } = await supabase.rpc("review_competence", { p_item_id: itemId, p_decision: decision, p_note: note });
  if (error) return { error: error.message };

  if (decision === "needs_info") {
    const { data: item } = await supabase
      .from("checklist_items")
      .select("member_id, project_members(email), projects(name)")
      .eq("id", itemId)
      .maybeSingle();
    if (item?.project_members?.email) {
      const reviewer = await myName(userId, supabase);
      await notifyMember(supabase, {
        projectId,
        memberId: item.member_id,
        to: item.project_members.email,
        kind: "competence_needs_info",
        subject: `More information needed for your competence statement – ${item.projects?.name ?? "your project"}`,
        lines: [
          `${reviewer} has reviewed your competence statement for ${item.projects?.name ?? "the project"} and needs more information:`,
          note.trim(),
          "Please update your statement and submit it again.",
        ],
        path: `/projects/${projectId}/tasks/${itemId}`,
        button: "Update your statement",
        fromName: reviewer,
      });
    }
  }

  revalidatePath(`/projects/${projectId}`, "layout");
  return { error: null };
}

export async function reportChange(projectId: string, note: string): Promise<ReviewResult> {
  const { supabase, userId } = await requireAal2();
  const { error } = await supabase.rpc("report_competence_change", { p_project_id: projectId, p_note: note });
  if (error) return { error: error.message };

  const [{ data: owners }, { data: project }, reporter] = await Promise.all([
    supabase.from("project_members").select("id, email").eq("project_id", projectId).eq("is_owner", true).is("removed_at", null),
    supabase.from("projects").select("name").eq("id", projectId).maybeSingle(),
    myName(userId, supabase),
  ]);
  for (const owner of owners ?? []) {
    await notifyMember(supabase, {
      projectId,
      memberId: owner.id,
      to: owner.email,
      kind: "competence_change_reported",
      subject: `${reporter} has reported a change in competence – ${project?.name ?? "your project"}`,
      lines: [
        `${reporter} has reported a change affecting their competence on ${project?.name ?? "the project"} (regulation 11I):`,
        note.trim(),
        "Their competence statement has been sent back for review.",
      ],
      path: `/projects/${projectId}`,
      button: "Open the project",
      fromName: reporter,
    });
  }

  revalidatePath(`/projects/${projectId}`, "layout");
  return { error: null };
}
