import "server-only";
import { zipSync } from "fflate";
import { escapeHtml, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPack, sha256 } from "./build";
import { gatherPack } from "./gather";

// The export job: gather, build, zip, store privately, record, tell the
// owner. Uses the secret key, as PLAN.md allows for the export job only.
export async function runExport(exportId: string, appUrl: string) {
  const db = createAdminClient();
  const finish = (status: string, extra: Partial<{ path: string; name: string; size: number; sha: string; count: number; warnings: number; error: string }> = {}) =>
    db.rpc("finish_export", {
      p_export_id: exportId, p_status: status,
      p_path: extra.path ?? null!, p_file_name: extra.name ?? null!, p_size: extra.size ?? null!,
      p_sha256: extra.sha ?? null!, p_file_count: extra.count ?? null!, p_warnings: extra.warnings ?? null!,
      p_error: extra.error ?? null!,
    });

  const { data: exp } = await db.from("exports").select("id, project_id, requested_by").eq("id", exportId).single();
  if (!exp) return;
  await finish("building");

  try {
    const pack = await buildPack(await gatherPack(db, exp.project_id));
    const zip = zipSync(Object.fromEntries(pack.entries), { level: 6 });
    const fileName = `${pack.ref}_evidence_pack_${new Date().toISOString().slice(0, 10)}.zip`;
    const path = `${exp.project_id}/${exportId}.zip`;
    const { error } = await db.storage.from("exports").upload(path, zip, { contentType: "application/zip", upsert: false });
    if (error) throw new Error(error.message);
    await finish("ready", {
      path, name: fileName, size: zip.length, sha: sha256(zip), count: pack.entries.size,
      warnings: pack.warnings.filter((w) => w.startsWith("FINGERPRINT") || w.startsWith("Missing")).length,
    });

    const { data: user } = await db.auth.admin.getUserById(exp.requested_by);
    const email = user.user?.email;
    if (email) {
      const link = `${appUrl}/projects/${exp.project_id}/exports`;
      await sendEmail({
        to: email,
        subject: `Your evidence pack is ready: ${pack.ref}`,
        text: `Your evidence pack is ready to download for the next 24 hours:\n${link}\n\nYou'll need to sign in with two-factor.`,
        html: `<p>Your evidence pack is ready to download for the next 24 hours.</p><p><a href="${escapeHtml(link)}">Open exports</a></p><p style="color:#525252;font-size:13px">You'll need to sign in with two-factor.</p>`,
      });
    }
  } catch (err) {
    await finish("failed", { error: (err as Error).message });
  }
}
