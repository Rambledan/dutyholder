"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { appUrl } from "@/lib/app-url";
import { requireAal2 } from "@/lib/auth/server";
import { runExport } from "@/lib/evidence/job";

// The owner asks for a pack; it is built in the background after this
// returns, and the page shows its progress.
export async function requestExport(projectId: string): Promise<{ error: string | null }> {
  const { supabase } = await requireAal2();
  const { data: exportId, error } = await supabase.rpc("request_export", { p_project_id: projectId });
  if (error || !exportId) return { error: error?.message ?? "Couldn't start the export." };
  const url = await appUrl();
  after(() => runExport(exportId, url));
  revalidatePath(`/projects/${projectId}/exports`);
  return { error: null };
}
