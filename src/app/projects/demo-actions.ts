"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Json } from "@/lib/supabase/database.types";
import { appUrl } from "@/lib/app-url";
import { requireAal2 } from "@/lib/auth/server";
import { loadDemoSnapshot } from "@/lib/demo/load";
import { planDemoDay } from "@/lib/demo/simulate";

export type DemoResult = { error: string | null; day?: number; date?: string; allGreen?: boolean; events?: string[] };

export async function createDemo(): Promise<void> {
  const { supabase } = await requireAal2();
  const { data: projectId, error } = await supabase.rpc("create_demo_project");
  if (error || !projectId) throw new Error(error?.message ?? "Couldn't create the demo.");
  redirect(`/projects/${projectId}/dashboard`);
}

async function stepOnce(projectId: string): Promise<DemoResult> {
  const { supabase } = await requireAal2();
  const snap = await loadDemoSnapshot(supabase, projectId);
  if (!snap) return { error: "This isn't a demo project." };
  const day = planDemoDay(snap, await appUrl());
  const { error } = await supabase.rpc("demo_step", {
    p_project_id: projectId,
    p_expected_day: day.day,
    p_changes: day.changes as unknown as Json,
    p_reminders: day.emails as unknown as Json,
    p_state: day.state as unknown as Json,
  });
  if (error) return { error: error.message };
  return { error: null, day: day.day, date: day.date, allGreen: day.allGreen, events: day.events };
}

export async function advanceDemo(projectId: string): Promise<DemoResult> {
  const result = await stepOnce(projectId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return result;
}

// Skip quiet days: keep advancing until something happens (an email or a
// status change), or everything is green, up to two weeks at a time.
export async function advanceDemoToNextEvent(projectId: string): Promise<DemoResult> {
  let last: DemoResult = { error: null };
  const skipped: string[] = [];
  for (let i = 0; i < 14; i++) {
    last = await stepOnce(projectId);
    if (last.error || last.allGreen || (last.events?.length ?? 0) > 0) break;
    if (last.date) skipped.push(last.date);
  }
  revalidatePath(`/projects/${projectId}`, "layout");
  return { ...last, events: [...(skipped.length ? [`Quiet days skipped: ${skipped.length}`] : []), ...(last.events ?? [])] };
}
