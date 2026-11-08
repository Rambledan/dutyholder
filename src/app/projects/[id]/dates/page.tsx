import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/projects/page-shell";
import { DateForm } from "@/components/projects/date-form";
import { HelpLink } from "@/components/help/help-link";
import { requireAal2 } from "@/lib/auth/server";
import { londonParts, projectNow } from "@/lib/clock";
import { longDate } from "@/lib/deadlines";
import { roleLabel } from "@/lib/labels";
import { saveAppointmentEnd, saveProjectDate } from "../../deadline-actions";

export const metadata = { title: "Key dates · Dutyholder" };

export default function DatesPage(props: PageProps<"/projects/[id]/dates">) {
  return (
    <PageShell back={{ href: ".", label: "Back to project" }}>
      <Dates params={props.params} />
    </PageShell>
  );
}

async function Dates({ params }: { params: PageProps<"/projects/[id]/dates">["params"] }) {
  const { supabase } = await requireAal2();
  const { id } = await params;

  const [{ data: project }, { data: isOwner }, { data: members }, { data: appointments }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("is_project_owner", { p_project_id: id }),
    supabase.from("project_members")
      .select("id, user_id, email, display_name, role, appointment_ended_on")
      .eq("project_id", id).is("removed_at", null).order("created_at"),
    supabase.from("appointments").select("kind, status").eq("project_id", id).neq("status", "void"),
  ]);
  if (!project || !isOwner || !members) notFound();

  const userIds = members.map((m) => m.user_id).filter((u): u is string => Boolean(u));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameOf = (m: (typeof members)[number]) =>
    profiles?.find((p) => p.id === m.user_id)?.full_name || m.display_name || m.email;

  const today = londonParts(projectNow(project)).date;
  const signed = (kind: string) => appointments?.some((a) => a.kind === kind && a.status === "signed");
  const multiple = project.expected_contractors > 1;
  const startBlocked = multiple && !(signed("pd_appointment") && signed("pc_appointment"))
    ? "Both the principal designer and principal contractor appointments must be signed before construction starts (reg 11D(3)). Prepare and sign them from the project page first."
    : null;
  const principals = members.filter((m) =>
    m.role === "principal_designer" || m.role === "principal_contractor" || (m.role === "contractor" && !multiple));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{project.name}</p>
        <h1 className="flex items-center gap-2 text-4xl font-medium tracking-[-0.03em] sm:text-[44px] sm:leading-[48px]">
          Key dates <HelpLink topic="deadlines" />
        </h1>
        <p className="text-sm text-muted-foreground">
          Each date starts a legal clock. Dutyholder gives the right person a task with its deadline and reminds them,
          every day of the week when it&apos;s close. Every change is kept in the audit trail.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Before and during construction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateForm id="bc_application_date" label="Building control application made" initial={project.bc_application_date}
            max={today}
            hint="A principal designer or principal contractor appointed after this date must be notified to building control within 14 days (reg 11O)."
            action={saveProjectDate.bind(null, id, "bc_application_date")} />
          <DateForm id="construction_started_on" label="Construction started" initial={project.construction_started_on}
            max={today} blockedReason={startBlocked}
            hint={project.construction_start_date
              ? `Planned start: ${longDate(project.construction_start_date)}. Record the actual date here once work begins.`
              : "Record the date building work actually began."}
            action={saveProjectDate.bind(null, id, "construction_started_on")} />
          <DateForm id="occupation_date" label="Early occupation (if any)" initial={project.occupation_date}
            hint="If any part will be occupied before the work is complete, the principal contractor must give building control at least 5 days' notice (reg 16(5))."
            action={saveProjectDate.bind(null, id, "occupation_date")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Principal appointments ending</CardTitle>
          <CardDescription>
            When a principal designer&apos;s or principal contractor&apos;s appointment ends, they have 28 days to give the
            client their handover document (regs 11M(5)(b), 11N(5)(b)). They stay on the project so they can still sign
            at completion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {principals.length === 0 && (
            <p className="text-sm text-muted-foreground">No principal designer or principal contractor on the team yet.</p>
          )}
          {principals.map((m) => (
            <DateForm key={m.id} id={`end-${m.id}`} label={`${nameOf(m)} · ${roleLabel(m.role)}`}
              initial={m.appointment_ended_on} max={today} submitLabel="Record end date"
              action={saveAppointmentEnd.bind(null, id, m.id)} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <DateForm id="work_completed_on" label="Building work completed" initial={project.work_completed_on}
            max={today} submitLabel="Mark work complete"
            blockedReason={project.construction_started_on ? null : "Record when construction started first."}
            hint="Starts the 5-day clock (reg 16(4)): the completion notice must include signed statements from the client and from every principal designer and principal contractor, including any who have left."
            action={saveProjectDate.bind(null, id, "work_completed_on")} />
        </CardContent>
      </Card>
    </div>
  );
}
