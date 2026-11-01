"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAal2 } from "@/lib/auth/server";

export type AccountResult = { error: string | null; message?: string; next?: string };

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export async function saveProfile(_prev: AccountResult, formData: FormData): Promise<AccountResult> {
  const { supabase, userId } = await requireAal2();
  const fullName = clean(formData.get("full_name"), 120);
  if (fullName.length < 2) return { error: "Enter your full name." };
  const { error } = await supabase.from("profiles").update({
    full_name: fullName,
    company: clean(formData.get("company"), 160) || null,
    job_title: clean(formData.get("job_title"), 120),
    phone: clean(formData.get("phone"), 40) || null,
    memberships: clean(formData.get("memberships"), 2000),
  }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null, message: "Saved. Your details are used on every project." };
}

export async function acceptInvitation(memberId: string): Promise<void> {
  const { supabase } = await requireAal2();
  const { data: projectId, error } = await supabase.rpc("accept_invitation", { p_member_id: memberId });
  if (error || !projectId) throw new Error(error?.message ?? "Couldn't accept the invitation.");
  revalidatePath("/", "layout");
  redirect(`/projects/${projectId}/tasks`);
}

export async function declineInvitation(memberId: string): Promise<void> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("decline_invitation", { p_member_id: memberId });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

// Saves the draft competence statement as a new version, outside any project.
export async function submitCompetencePassport(): Promise<AccountResult> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("submit_competence_passport");
  if (error) return { error: error.message };
  revalidatePath("/account", "layout");
  return { error: null, next: "/account" };
}
