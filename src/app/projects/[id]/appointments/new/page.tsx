import { notFound } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrepareForm } from "@/components/appointments/prepare-form";
import { PageShell } from "@/components/projects/page-shell";
import { letterContext } from "@/lib/appointments";
import { requireAal2 } from "@/lib/auth/server";
import { KIND_LABELS, formatLetterDate, type AppointmentKind } from "@/lib/letters";
import { HelpLink } from "@/components/help/help-link";

export const metadata = { title: "Prepare appointment · Dutyholder" };

export default function NewAppointmentPage(props: PageProps<"/projects/[id]/appointments/new">) {
  return (
    <PageShell>
      <NewAppointment params={props.params} searchParams={props.searchParams} />
    </PageShell>
  );
}

async function NewAppointment(props: {
  params: PageProps<"/projects/[id]/appointments/new">["params"];
  searchParams: PageProps<"/projects/[id]/appointments/new">["searchParams"];
}) {
  const { supabase } = await requireAal2();
  const { id: projectId } = await props.params;
  const { kind: rawKind } = await props.searchParams;
  const kind = rawKind as AppointmentKind;
  if (!(kind in KIND_LABELS)) notFound();

  const { data: isOwner } = await supabase.rpc("is_project_owner", { p_project_id: projectId });
  if (!isOwner) notFound();
  const ctx = await letterContext(supabase, projectId, kind);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-xl">{KIND_LABELS[kind]} <HelpLink topic="principal-appointments" /></CardTitle>
        <CardDescription>
          {kind === "lead_designer_agreement"
            ? "Every designer on the project will be asked to sign."
            : "The client signs to appoint, and the appointee signs to accept."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Draft wording. Have it checked by the principal designer, and ideally a construction lawyer, before
            collecting real signatures.
          </AlertDescription>
        </Alert>
        {ctx.appointers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody on the project holds this duty yet. Add the {kind === "lead_designer_agreement" ? "designers" : "client"} to
            the team first.
          </p>
        ) : ctx.candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add the person being appointed to the team first.</p>
        ) : (
          <PrepareForm projectId={projectId} kind={kind} projectName={ctx.project.name} projectAddress={ctx.project.address}
            date={formatLetterDate(new Date())} clients={ctx.clients} domesticClient={ctx.project.is_domestic_client}
            appointers={ctx.appointers} candidates={ctx.candidates} />
        )}
      </CardContent>
    </Card>
  );
}
