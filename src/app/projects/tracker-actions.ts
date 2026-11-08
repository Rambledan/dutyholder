"use server";

import { revalidatePath } from "next/cache";
import { requireAal2 } from "@/lib/auth/server";
import { REQUIREMENT_STATUSES, ROUTES, type ComplianceRoute, type RequirementRelevance, type RequirementStatus } from "@/lib/tracker";

// The tracker's writes. The database checks who may do each one and logs it;
// these only read the form and report what it said.

export type TrackerState = { error: string | null; saved: boolean };

const ok = (projectId: string): TrackerState => {
  revalidatePath(`/projects/${projectId}/tracker`, "layout");
  return { error: null, saved: true };
};
const text = (f: FormData, k: string) => String(f.get(k) ?? "");
// Blank choices must reach the database as null, not be left out.
const orNull = (f: FormData, k: string) => text(f, k) || null;

export async function setRelevance(projectId: string, rowId: string, _p: TrackerState, f: FormData): Promise<TrackerState> {
  const relevance = text(f, "relevance") as RequirementRelevance;
  if (!["to_confirm", "relevant", "not_relevant"].includes(relevance)) return { error: "Choose an option.", saved: false };
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("set_requirement_relevance", { p_ids: [rowId], p_relevance: relevance, p_reason: text(f, "reason") });
  return error ? { error: error.message, saved: false } : ok(projectId);
}

// Confirms every still-unconfirmed row in a group as relevant.
export async function markRelevant(projectId: string, rowIds: string[]): Promise<void> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("set_requirement_relevance", { p_ids: rowIds, p_relevance: "relevant", p_reason: "" });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/tracker`, "layout");
}

export async function assignByDiscipline(projectId: string): Promise<void> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("assign_requirements_by_discipline", { p_project_id: projectId });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/tracker`, "layout");
}

export async function assignRow(projectId: string, rowId: string, _p: TrackerState, f: FormData): Promise<TrackerState> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("assign_requirement", {
    p_id: rowId, p_owner: orNull(f, "owner"), p_stage2: orNull(f, "stage2"), p_stage3: orNull(f, "stage3"),
    p_stage4: orNull(f, "stage4"), p_stage5: orNull(f, "stage5"),
  });
  return error ? { error: error.message, saved: false } : ok(projectId);
}

export async function saveAnswer(projectId: string, rowId: string, _p: TrackerState, f: FormData): Promise<TrackerState> {
  const status = text(f, "status") as RequirementStatus;
  if (!REQUIREMENT_STATUSES.some((s) => s.value === status)) return { error: "Choose a status.", saved: false };
  const route = text(f, "route") as ComplianceRoute;
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("save_requirement_answer", {
    p_id: rowId, p_route: ROUTES.some((r) => r.value === route) ? route : null, p_guidance: text(f, "guidance"),
    p_standard_basis: text(f, "standard_basis"), p_project_application: text(f, "project_application"),
    p_notes: text(f, "notes"), p_status: status,
  });
  return error ? { error: error.message, saved: false } : ok(projectId);
}

export async function saveAction(projectId: string, rowId: string, _p: TrackerState, f: FormData): Promise<TrackerState> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("set_requirement_action", {
    p_id: rowId, p_text: text(f, "action_text"), p_member: orNull(f, "action_member"), p_due: orNull(f, "action_due"),
  });
  return error ? { error: error.message, saved: false } : ok(projectId);
}
