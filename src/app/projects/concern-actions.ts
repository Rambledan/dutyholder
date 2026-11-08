"use server";

import { revalidatePath } from "next/cache";
import { requireAal2 } from "@/lib/auth/server";
import { CONCERN_KINDS, effectiveRoles, isConcernKind } from "@/lib/concerns";
import { notifyMember } from "@/lib/notify";

// Raising and answering concerns (regs 11K(4), 11L(4), 11M(4), 11N(4)). The
// database checks who may do what and records both, append-only; these
// actions then email the other side.

export type ConcernState = { error: string | null; done: boolean };

async function context(projectId: string) {
  const { supabase, userId } = await requireAal2();
  const [{ data: project }, { data: members }, { data: profile }] = await Promise.all([
    supabase.from("projects").select("name, expected_contractors").eq("id", projectId).maybeSingle(),
    supabase.from("project_members").select("id, user_id, email, display_name, role, is_owner, declined_at")
      .eq("project_id", projectId).is("removed_at", null),
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  return { supabase, userId, project, members: members ?? [], myName: profile?.full_name || "A member of the project team" };
}

export async function raiseConcern(projectId: string, _prev: ConcernState, formData: FormData): Promise<ConcernState> {
  const kind = String(formData.get("kind") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!isConcernKind(kind)) return { error: "Choose what kind of concern this is.", done: false };
  if (!subject || !body) return { error: "Give the concern a short subject and describe it.", done: false };

  const { supabase, project, members, myName } = await context(projectId);
  const { error } = await supabase.rpc("raise_concern", { p_project_id: projectId, p_kind: kind, p_subject: subject, p_body: body });
  if (error) return { error: error.message, done: false };

  // Email whoever it's addressed to; if nobody holds that role yet, the owner.
  const to = CONCERN_KINDS[kind].to;
  const contractors = project?.expected_contractors ?? 2;
  let recipients = members.filter((m) => !m.declined_at && effectiveRoles([m.role], contractors).includes(to));
  if (!recipients.length) recipients = members.filter((m) => m.is_owner);
  for (const m of recipients) {
    await notifyMember(supabase, {
      projectId, memberId: m.id, to: m.email, kind: "concern_raised",
      subject: `${CONCERN_KINDS[kind].label} raised – ${project?.name ?? "your project"}`,
      lines: [
        `${myName} has raised a ${CONCERN_KINDS[kind].label.toLowerCase()} on ${project?.name ?? "the project"} (${CONCERN_KINDS[kind].reg}):`,
        subject,
        "Please read it and record your response in Dutyholder, so it is on the record.",
      ],
      path: `/projects/${projectId}/concerns`, button: "Read and respond", fromName: myName,
    });
  }

  revalidatePath(`/projects/${projectId}/concerns`);
  return { error: null, done: true };
}

export async function respondToConcern(
  projectId: string, concernId: string, _prev: ConcernState, formData: FormData,
): Promise<ConcernState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write your response.", done: false };

  const { supabase, project, members, myName } = await context(projectId);
  const { data: concern } = await supabase.from("concerns")
    .select("subject, kind, raised_by_member_id").eq("id", concernId).maybeSingle();
  const { error } = await supabase.rpc("respond_to_concern", { p_concern_id: concernId, p_body: body });
  if (error) return { error: error.message, done: false };

  const raiser = members.find((m) => m.id === concern?.raised_by_member_id);
  if (raiser && concern) {
    await notifyMember(supabase, {
      projectId, memberId: raiser.id, to: raiser.email, kind: "concern_responded",
      subject: `Response to your concern – ${project?.name ?? "your project"}`,
      lines: [`${myName} has responded to your concern "${concern.subject}" on ${project?.name ?? "the project"}.`],
      path: `/projects/${projectId}/concerns`, button: "Read the response", fromName: myName,
    });
  }

  revalidatePath(`/projects/${projectId}/concerns`);
  return { error: null, done: true };
}
