import { createClient } from "@/lib/supabase/server";

// Owner-only, 2FA, while the pack is live (24h). Logs the download, then
// redirects to a storage link that stops working after 60 seconds.
export async function GET(request: Request, ctx: RouteContext<"/projects/[id]/exports/[exportId]/download">) {
  const { id: projectId, exportId } = await ctx.params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (claims?.claims?.aal !== "aal2") return new Response("Two-factor verification required", { status: 401 });

  const { data: exp } = await supabase.from("exports").select("*").eq("id", exportId).eq("project_id", projectId).maybeSingle();
  if (!exp || exp.status !== "ready" || !exp.storage_path) return new Response("Not found", { status: 404 });

  const { error: logError } = await supabase.rpc("record_export_download", { p_export_id: exportId });
  if (logError) return new Response(logError.message, { status: 410 });

  const { data, error } = await supabase.storage.from("exports")
    .createSignedUrl(exp.storage_path, 60, { download: exp.file_name ?? "evidence-pack.zip" });
  if (error || !data) return new Response("Couldn't create the download link", { status: 500 });
  return Response.redirect(data.signedUrl, 302);
}
