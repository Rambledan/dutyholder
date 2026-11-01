"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAal2 } from "@/lib/auth/server";
import { letterContext } from "@/lib/appointments";
import { KIND_LABELS, TEMPLATE_VERSION, buildLetter, formatLetterDate, type AppointmentKind } from "@/lib/letters";
import { notifyMember } from "@/lib/notify";

export type AppointmentResult = { error: string | null; id?: string };

// The server rebuilds the letter from the database rather than trusting
// text sent by the browser, then freezes and fingerprints it.
export async function prepareAppointment(
  projectId: string,
  kind: AppointmentKind,
  appointeeMemberId: string,
  scope: string,
): Promise<AppointmentResult> {
  const { supabase, userId } = await requireAal2();
  const ctx = await letterContext(supabase, projectId, kind);
  const appointee = ctx.candidates.find((c) => c.memberId === appointeeMemberId);
  if (!appointee) return { error: "Choose who is being appointed." };

  const letter = buildLetter({
    kind,
    projectName: ctx.project.name,
    projectAddress: ctx.project.address,
    date: formatLetterDate(new Date()),
    clients: ctx.clients,
    domesticClient: ctx.project.is_domestic_client,
    appointers: ctx.appointers,
    appointee: appointee.person,
    scope: kind === "cdm_certification" ? "" : scope,
  });

  const { data: id, error } = await supabase.rpc("prepare_appointment", {
    p_project_id: projectId,
    p_kind: kind,
    p_appointee_member_id: appointeeMemberId,
    p_letter_title: letter.title,
    p_letter_text: letter.text,
    p_template_version: TEMPLATE_VERSION,
  });
  if (error || !id) return { error: error?.message ?? "Couldn't issue the letter." };

  // Ask each signatory to sign.
  const [{ data: signatories }, { data: me }] = await Promise.all([
    supabase.from("appointment_signatories").select("member_id, project_members(email, user_id)").eq("appointment_id", id),
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  const fromName = me?.full_name || "The project owner";
  for (const s of signatories ?? []) {
    if (!s.project_members?.email || s.project_members.user_id === userId) continue;
    await notifyMember(supabase, {
      projectId,
      memberId: s.member_id,
      to: s.project_members.email,
      kind: "appointment_to_sign",
      subject: `Please sign: ${letter.title}`,
      lines: [
        `${fromName} has issued the ${KIND_LABELS[kind].toLowerCase()} for ${ctx.project.name}.`,
        "Please read it and sign with your typed name. It takes about two minutes.",
      ],
      path: `/projects/${projectId}/appointments/${id}`,
      button: "Read and sign",
      fromName,
    });
  }

  revalidatePath(`/projects/${projectId}`, "layout");
  return { error: null, id };
}

export async function signAppointment(
  projectId: string,
  appointmentId: string,
  party: string,
  typedName: string,
): Promise<AppointmentResult> {
  const { supabase } = await requireAal2();
  const userAgent = (await headers()).get("user-agent");
  const { error } = await supabase.rpc("sign_appointment", {
    p_appointment_id: appointmentId,
    p_party: party,
    p_typed_name: typedName,
    p_user_agent: userAgent ?? undefined,
  });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`, "layout");
  return { error: null };
}

export async function voidAppointment(projectId: string, appointmentId: string, reason: string): Promise<AppointmentResult> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("void_appointment", { p_appointment_id: appointmentId, p_reason: reason });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`, "layout");
  return { error: null };
}
