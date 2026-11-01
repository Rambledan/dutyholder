import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentSignForm } from "@/components/appointments/sign-form";
import { VoidButton } from "@/components/appointments/void-form";
import { PageShell } from "@/components/projects/page-shell";
import { people } from "@/lib/appointments";
import { requireAal2 } from "@/lib/auth/server";
import { KIND_LABELS, partyLabel } from "@/lib/letters";
import { Term } from "@/components/help/term";
import { HelpLink } from "@/components/help/help-link";

export const metadata = { title: "Appointment · Dutyholder" };

type Params = PageProps<"/projects/[id]/appointments/[appointmentId]">["params"];

export default function AppointmentPage(props: PageProps<"/projects/[id]/appointments/[appointmentId]">) {
  return (
    <PageShell>
      <Appointment params={props.params} />
    </PageShell>
  );
}

const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

async function Appointment({ params }: { params: Params }) {
  const { supabase, userId } = await requireAal2();
  const { id: projectId, appointmentId } = await params;

  const [{ data: a }, { data: signatories }, { data: signatures }, { data: isOwner }, { data: me }, { data: project }] = await Promise.all([
    supabase.from("appointments").select("*").eq("id", appointmentId).eq("project_id", projectId).maybeSingle(),
    supabase.from("appointment_signatories")
      .select("member_id, party, project_members(id, user_id, email, display_name, role, is_firm)")
      .eq("appointment_id", appointmentId),
    supabase.from("appointment_signatures").select("member_id, party, typed_name, signed_at").eq("appointment_id", appointmentId),
    supabase.rpc("is_project_owner", { p_project_id: projectId }),
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("projects").select("is_domestic_client").eq("id", projectId).maybeSingle(),
  ]);
  if (!a) notFound();
  const domestic = Boolean(project?.is_domestic_client);

  const members = (signatories ?? []).map((s) => s.project_members!).filter(Boolean);
  const names = await people(supabase, members);
  const rows = (signatories ?? [])
    .sort((x, y) => x.party.localeCompare(y.party))
    .map((s) => ({
      ...s,
      name: names.get(s.member_id)?.name ?? "",
      signature: signatures?.find((g) => g.member_id === s.member_id && g.party === s.party),
      mine: s.project_members?.user_id === userId,
    }));
  const toSign = a.status === "awaiting_signatures" ? rows.filter((r) => r.mine && !r.signature) : [];
  const statusText = a.status === "signed" ? `Signed by all parties ${a.completed_at ? fmt(a.completed_at) : ""}`
    : a.status === "void" ? `Void: ${a.void_reason}` : "Waiting for signatures";

  return (
    <div className="space-y-4">
      <Link href={`/projects/${projectId}`} className="inline-block text-sm text-muted-foreground hover:underline">← Back to project</Link>
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {KIND_LABELS[a.kind]} · {statusText}
          </p>
          <CardTitle className="text-xl">{a.letter_title}</CardTitle>
          <CardDescription className="font-mono text-xs">
            <Term id="sha256">Fingerprint</Term> {a.letter_sha256.slice(0, 16)}… · template {a.template_version}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 font-sans text-sm leading-relaxed">{a.letter_text}</pre>

          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">Signatures <HelpLink topic="signatures" /></h3>
            <ul className="divide-y rounded-lg border text-sm">
              {rows.map((r) => (
                <li key={`${r.member_id}-${r.party}`} className="flex flex-wrap justify-between gap-2 p-3">
                  <span>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground"> · {partyLabel(r.party, domestic)}</span>
                  </span>
                  <span className={r.signature ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>
                    {r.signature ? `Signed ${fmt(r.signature.signed_at)}` : "Not signed yet"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {toSign.map((r) => (
            <AppointmentSignForm key={r.party} projectId={projectId} appointmentId={a.id} party={r.party}
              partyLabel={partyLabel(r.party, domestic)} fullName={me?.full_name ?? ""} />
          ))}

          <div className="flex flex-wrap items-start gap-3">
            <a href={`/projects/${projectId}/appointments/${a.id}/pdf`} className={buttonVariants({ variant: "outline" })}>
              Download PDF
            </a>
            {isOwner && a.status !== "void" && (
              <Term id="void"><VoidButton projectId={projectId} appointmentId={a.id} /></Term>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
