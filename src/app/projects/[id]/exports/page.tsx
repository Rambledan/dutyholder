import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportControls } from "@/components/exports/export-controls";
import { PageShell } from "@/components/projects/page-shell";
import { requireAal2 } from "@/lib/auth/server";
import { Term } from "@/components/help/term";
import { HelpLink } from "@/components/help/help-link";

export const metadata = { title: "Evidence pack · Dutyholder" };

const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });
// A pack can be downloaded until it expires (24 hours after it's ready).
const isLive = (e: { status: string; expires_at: string | null }) =>
  e.status === "ready" && e.expires_at !== null && new Date(e.expires_at).getTime() > Date.now();
const size = (n: number | null) => (n === null ? "—" : n < 1024 * 1024 ? `${Math.ceil(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export default function ExportsPage(props: PageProps<"/projects/[id]/exports">) {
  return (
    <PageShell>
      <Exports params={props.params} />
    </PageShell>
  );
}

async function Exports({ params }: { params: PageProps<"/projects/[id]/exports">["params"] }) {
  const { supabase } = await requireAal2();
  const { id } = await params;
  const [{ data: isOwner }, { data: project }, { data: exports }] = await Promise.all([
    supabase.rpc("is_project_owner", { p_project_id: id }),
    supabase.from("projects").select("name, is_demo").eq("id", id).maybeSingle(),
    supabase.from("exports").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!isOwner || !project) notFound();
  const building = (exports ?? []).some((e) => e.status === "queued" || e.status === "building");

  return (
    <div className="space-y-4">
      <Link href={`/projects/${id}/dashboard`} className="inline-block text-sm text-muted-foreground hover:underline">← Dashboard</Link>
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">{project.name}</p>
          <CardTitle className="flex items-center gap-1.5 text-xl">Evidence pack <HelpLink topic="evidence-pack" /></CardTitle>
          <CardDescription className="text-base">
            A zip of everything on record: appointments, competence statements with their evidence, signed
            acknowledgements, notifications, the handover and the full <Term id="audit-trail">audit trail</Term>, with an index
            listing every file&apos;s <Term id="sha256">SHA-256 fingerprint</Term>. Packs can be downloaded for 24 hours.
            {project.is_demo && " This is a demo project, so the pack is marked as simulated."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportControls projectId={id} building={building} />
        </CardContent>
      </Card>

      {(exports ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Packs</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border text-sm">
              {exports!.map((e) => {
                const live = isLive(e);
                return (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="font-medium">{e.file_name ?? "Evidence pack"}</div>
                      <div className="text-xs text-muted-foreground">
                        Requested {fmt(e.created_at)} ·{" "}
                        {e.status === "ready"
                          ? `${e.file_count} files, ${size(e.size_bytes)}${live ? ` · expires ${fmt(e.expires_at!)}` : " · expired"}`
                          : e.status === "failed" ? `Failed: ${e.error}` : "Building…"}
                      </div>
                      {e.sha256 && <div className="font-mono text-xs text-muted-foreground">SHA-256 {e.sha256}</div>}
                      {e.warnings > 0 && (
                        <div className="text-xs font-medium text-destructive">
                          {e.warnings} file problem{e.warnings === 1 ? "" : "s"}: see 00_Index.pdf
                        </div>
                      )}
                    </div>
                    {live && (
                      <a href={`/projects/${id}/exports/${e.id}/download`} className={buttonVariants({ variant: "outline" })}>
                        Download
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
