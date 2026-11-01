"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAal2 } from "@/lib/auth/server";
import { appUrl } from "@/lib/app-url";
import { emailConfigured, sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/invite-email";
import { ROLES, roleLabel, type DutyholderRole } from "@/lib/labels";
import { notifyMember } from "@/lib/notify";

export type FormState = { error: string | null };

function readSetup(formData: FormData) {
  const isDomestic = formData.get("is_domestic_client") === "yes";
  return {
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    isDomestic,
    domesticToPd: isDomestic && formData.get("domestic_duties_to_pd") === "yes",
    isHigherRisk: formData.get("is_higher_risk") === "yes",
    expectedContractors: formData.get("contractors") === "one" ? 1 : 2,
    cdmPdCertified: formData.get("cdm_pd_certified") === "on",
    constructionStartDate: /^\d{4}-\d{2}-\d{2}$/.test(String(formData.get("construction_start_date") ?? ""))
      ? String(formData.get("construction_start_date"))
      : null,
  };
}

function asRole(value: FormDataEntryValue | null): DutyholderRole | null {
  return ROLES.find((r) => r.value === value)?.value ?? null;
}

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAal2();
  const s = readSetup(formData);
  const ownerRole = asRole(formData.get("owner_role"));

  if (!s.name) return { error: "Give the project a name." };
  if (!ownerRole) return { error: "Choose your role on this project." };
  if (s.isHigherRisk) return { error: "Higher-risk building work isn't supported in this version." };

  const { data: projectId, error } = await supabase.rpc("create_project", {
    p_name: s.name,
    p_address: s.address,
    p_description: s.description,
    p_is_domestic_client: s.isDomestic,
    p_domestic_duties_to_pd: s.domesticToPd,
    p_is_higher_risk: s.isHigherRisk,
    p_expected_contractors: s.expectedContractors,
    p_cdm_pd_certified: s.cdmPdCertified,
    p_owner_role: ownerRole,
  });
  if (error || !projectId) return { error: error?.message ?? "Couldn't create the project." };
  if (s.constructionStartDate) {
    await supabase.from("projects").update({ construction_start_date: s.constructionStartDate }).eq("id", projectId);
  }

  redirect(`/projects/${projectId}`);
}

export async function updateProject(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAal2();
  const s = readSetup(formData);

  if (!s.name) return { error: "Give the project a name." };
  if (s.isHigherRisk) return { error: "Higher-risk building work isn't supported in this version." };

  // RLS only lets the owner update; .select() tells us whether a row changed.
  const { data, error } = await supabase
    .from("projects")
    .update({
      name: s.name,
      address: s.address,
      description: s.description,
      is_domestic_client: s.isDomestic,
      domestic_duties_to_pd: s.domesticToPd,
      expected_contractors: s.expectedContractors,
      cdm_pd_certified: s.cdmPdCertified,
      construction_start_date: s.constructionStartDate,
    })
    .eq("id", projectId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only the project owner can change the set-up." };

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function addMember(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAal2();
  const role = asRole(formData.get("role"));
  if (!role) return { error: "Choose a role." };

  const { error } = await supabase.rpc("add_project_member", {
    p_project_id: projectId,
    p_email: String(formData.get("email") ?? ""),
    p_display_name: String(formData.get("display_name") ?? ""),
    p_role: role,
    p_discipline: String(formData.get("discipline") ?? ""),
    p_is_firm: formData.get("is_firm") === "on",
  });
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}

export type InviteResult =
  | { ok: true; sent: true; email: string; existingAccount: boolean }
  | { ok: true; sent: false; email: string; link: string | null; reason: string; existingAccount: boolean }
  | { ok: false; error: string };

// Creates a fresh single-use invite and emails it. If email isn't set up
// (or fails), returns the link so the owner can send it themselves.
export async function inviteMember(projectId: string, memberId: string): Promise<InviteResult> {
  const { supabase } = await requireAal2();

  const [{ data: invite, error }, { data: member }] = await Promise.all([
    supabase.rpc("invite_project_member", { p_member_id: memberId }).single(),
    supabase.from("project_members").select("role").eq("id", memberId).maybeSingle(),
  ]);
  if (error || !invite) return { ok: false, error: error?.message ?? "Couldn't create the invite." };

  revalidatePath(`/projects/${projectId}`);

  // Someone who already has an account doesn't sign up again: they see the
  // invitation when they sign in, and accept or decline it.
  if (invite.existing_account) {
    const owner = invite.owner_company ? `${invite.owner_name} (${invite.owner_company})` : invite.owner_name;
    const result = await notifyMember(supabase, {
      projectId,
      memberId,
      to: invite.email,
      kind: "invitation",
      subject: `${owner} has invited you to ${invite.project_name}`,
      lines: [
        `${owner} has invited you to join ${invite.project_name} on Dutyholder as the ${roleLabel(member?.role ?? null).toLowerCase()}.`,
        "You already have a Dutyholder account, so just sign in to accept or decline. Your saved details and competence statement can be reused.",
      ],
      path: "/account#invitations",
      button: "View the invitation",
      fromName: owner,
    });
    return result.sent
      ? { ok: true, sent: true, email: invite.email, existingAccount: true }
      : { ok: true, sent: false, email: invite.email, link: null, existingAccount: true,
          reason: "They already have an account: the invitation is waiting for them when they sign in." };
  }

  const next = `/projects/${projectId}/tasks`;
  const link = `${await appUrl()}/signup?token=${invite.token}&next=${encodeURIComponent(next)}`;

  if (!emailConfigured()) {
    return { ok: true, sent: false, email: invite.email, link, reason: "Email sending isn't set up yet.", existingAccount: false };
  }

  const message = inviteEmail({
    ownerName: invite.owner_name,
    projectName: invite.project_name,
    role: member?.role ?? null,
    link,
  });
  const result = await sendEmail({ to: invite.email, ...message });
  await supabase.rpc("record_invite_email", {
    p_member_id: memberId,
    p_sent: result.sent,
    p_detail: result.sent ? result.id : result.reason,
  });

  if (result.sent) return { ok: true, sent: true, email: invite.email, existingAccount: false };
  return { ok: true, sent: false, email: invite.email, link, reason: `The email couldn't be sent (${result.reason}).`, existingAccount: false };
}
