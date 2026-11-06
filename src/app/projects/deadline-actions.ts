"use server";

import { revalidatePath } from "next/cache";
import { requireAal2 } from "@/lib/auth/server";

// The trigger dates that start the statutory clocks (phase 8). The database
// checks every rule (owner only, two-factor, no future dates, both principal
// appointments signed before construction starts) and logs each change, so
// these actions only pass the date through and report what it said.

export type DateState = { error: string | null; saved: boolean };

const PROJECT_DATES = ["bc_application_date", "construction_started_on", "work_completed_on", "occupation_date"] as const;
export type ProjectDateField = (typeof PROJECT_DATES)[number];

function readDate(formData: FormData): string | null | undefined {
  const raw = String(formData.get("date") ?? "").trim();
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}

export async function saveProjectDate(
  projectId: string, field: ProjectDateField, _prev: DateState, formData: FormData,
): Promise<DateState> {
  if (!PROJECT_DATES.includes(field)) return { error: "Unknown date.", saved: false };
  const date = formData.get("clear") === "yes" ? null : readDate(formData);
  if (date === undefined) return { error: "Enter a date as day, month and year.", saved: false };

  const { supabase } = await requireAal2();
  const update: Partial<Record<ProjectDateField, string | null>> = { [field]: date };
  const { data, error } = await supabase.from("projects").update(update).eq("id", projectId).select("id");
  if (error) return { error: error.message, saved: false };
  if (!data?.length) return { error: "Only the project owner can record these dates.", saved: false };

  revalidatePath(`/projects/${projectId}`, "layout");
  return { error: null, saved: true };
}

export async function saveAppointmentEnd(
  projectId: string, memberId: string, _prev: DateState, formData: FormData,
): Promise<DateState> {
  const date = formData.get("clear") === "yes" ? null : readDate(formData);
  if (date === undefined) return { error: "Enter a date as day, month and year.", saved: false };

  const { supabase } = await requireAal2();
  const { data, error } = await supabase.from("project_members").update({ appointment_ended_on: date })
    .eq("id", memberId).eq("project_id", projectId).select("id");
  if (error) return { error: error.message, saved: false };
  if (!data?.length) return { error: "Only the project owner can record this.", saved: false };

  revalidatePath(`/projects/${projectId}`, "layout");
  return { error: null, saved: true };
}
