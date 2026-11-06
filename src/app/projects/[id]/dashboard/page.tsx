import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RowActions } from "@/components/dashboard/row-actions";
import { DemoPanel } from "@/components/demo/demo-panel";
import { Outbox } from "@/components/demo/outbox";
import { ProgressChart } from "@/components/demo/progress-chart";
import type { DemoState } from "@/lib/demo/simulate";
import { PageShell } from "@/components/projects/page-shell";
import { requireAal2 } from "@/lib/auth/server";
import { nextChase, type ChaseState } from "@/lib/chase/plan";
import { londonParts, projectNow } from "@/lib/clock";
import { isWaiting } from "@/lib/deadlines";
import { STATUS_LABELS, rag, roleLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Term } from "@/components/help/term";
import { HelpLink } from "@/components/help/help-link";
import { DEMO_ENABLED } from "@/lib/features";

export const metadata = { title: "Dashboard · Dutyholder" };

export default function DashboardPage(props: PageProps<"/projects/[id]/dashboard">) {
  return (
    <PageShell width="wide">
      <Dashboard params={props.params} />
    </PageShell>
  );
}

const DOT = { red: "bg-destructive", amber: "bg-warning", green: "bg-success" };
const KIND_LABEL: Record<string, string> = {
  nudge: "Nudge", reminder: "Reminder", firm: "Firm reminder", owner_digest: "Digest", manual: "Chased by you",
  deadline: "Legal deadline",
};
const shortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

async function Dashboard({ params }: { params: PageProps<"/projects/[id]/dashboard">["params"] }) {
  const { supabase } = await requireAal2();
  const { id } = await params;
  const { data: isOwner } = await supabase.rpc("is_project_owner", { p_project_id: id });
  if (!isOwner) notFound();

  const [{ data: project }, { data: members }, { data: items }, { data: reminders }, { data: signatories }, { data: signed }] =
    await Promise.all([
      supabase.from("projects")
        .select("id, name, clock_offset_days, construction_start_date, is_demo, demo_started_at, demo_state")
        .eq("id", id).maybeSingle(),
      supabase.from("project_members")
        .select("id, project_id, user_id, email, display_name, role, is_owner, chasing_paused, invited_at, created_at, appointment_ended_on")
        .eq("project_id", id).is("removed_at", null).order("created_at"),
      supabase.from("checklist_items")
        .select("id, project_id, member_id, template_code, status, due_date, duty_templates(title, item_type, legal_reference, sort_order)")
        .eq("project_id", id).is("withdrawn_at", null),
      supabase.from("reminders")
        .select("id, member_id, project_id, step_key, kind, recipient_email, cc_emails, project_day, status, created_at, simulated, subject, body_text")
        .eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("appointment_signatories")
        .select("appointment_id, member_id, party, appointments!inner(kind, status, project_id)")
        .eq("appointments.project_id", id).eq("appointments.status", "awaiting_signatures"),
      supabase.from("appointment_signatures").select("appointment_id, member_id, party"),
    ]);
  if (!project || !members) notFound();

  const userIds = members.map((m) => m.user_id).filter((x): x is string => Boolean(x));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameOf = (m: (typeof members)[number]) =>
    profiles?.find((p) => p.id === m.user_id)?.full_name || m.display_name || m.email;

  const state: ChaseState = {
    projects: [{ ...project, clock_offset_days: project.clock_offset_days }],
    members: members.map((m) => ({
      ...m, name: nameOf(m), started_at: m.invited_at ?? m.created_at,
    })),
    items: (items ?? []).map((i) => ({
      id: i.id, project_id: i.project_id, member_id: i.member_id, code: i.template_code, status: i.status,
      title: i.duty_templates?.title ?? "", item_type: i.duty_templates?.item_type ?? "form", due_date: i.due_date,
      legal_reference: i.duty_templates?.legal_reference ?? "",
    })),
    appointments: [],
    pending_signatures: (signatories ?? [])
      .filter((s) => !signed?.some((g) => g.appointment_id === s.appointment_id && g.member_id === s.member_id && g.party === s.party))
      .map((s) => ({ appointment_id: s.appointment_id, member_id: s.member_id, party: s.party, kind: s.appointments.kind, project_id: id })),
    reminders: reminders ?? [],
  };
  const now = projectNow(project);

  // Columns: every duty that applies to someone, in legal order.
  const columns = [...new Map((items ?? [])
    .sort((a, b) => (a.duty_templates?.sort_order ?? 0) - (b.duty_templates?.sort_order ?? 0))
    .map((i) => [i.template_code, { code: i.template_code, title: i.duty_templates?.title ?? "", ref: i.duty_templates?.legal_reference ?? "" }]))
    .values()];

  const all = items ?? [];
  const green = all.filter((i) => rag(i.status) === "green").length;
  const amber = all.filter((i) => rag(i.status) === "amber").length;
  // Legal clocks that haven't started (handover, completion statements)
  // aren't behind; they show grey until their trigger event.
  const waiting = all.filter((i) => rag(i.status) === "red" && isWaiting(i.template_code, i.due_date)).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{project.name}</p>
          <h1 className="text-4xl font-medium tracking-[-0.03em] sm:text-[44px] sm:leading-[48px]">Dashboard</h1>
          {project.clock_offset_days > 0 && !project.is_demo && (
            <p className="text-xs text-warning">Project clock is {project.clock_offset_days} days ahead: {shortDate(now)}</p>
          )}
        </div>
      </header>

      {DEMO_ENABLED && project.is_demo && (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">Demo controls <HelpLink topic="demo" /></CardTitle>
            <CardDescription>
              Fictional people, simulated time. Reminders come from the real chasing engine but go to the Outbox below,
              never to anyone&apos;s inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <DemoPanel projectId={id} day={project.clock_offset_days}
              date={new Date(`${londonParts(now).date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              allGreen={all.length > 0 && green === all.length} />
            <ProgressChart history={((project.demo_state ?? {}) as DemoState).history ?? []} total={all.length} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Duties complete" value={`${green} of ${all.length}`}
          meter={all.length ? green / all.length : 0}
          caption={`Across ${members.length} ${members.length === 1 ? "person" : "people"} on this project.`} />
        <StatCard label="In progress" value={String(amber)} tone="warning" badge="Awaiting review"
          caption="Started, submitted, or waiting for your review." />
        <StatCard label="Not started" value={String(all.length - green - amber - waiting)} tone="danger" badge="Needs chasing"
          caption={`Not started, or sent back for more information.${waiting ? ` ${waiting} more wait for a trigger date (grey).` : ""}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">People × duties <HelpLink topic="statuses" /></CardTitle>
          <CardDescription>
            <Term id="reminders">Reminders</Term> go out automatically on weekdays, 8am–6pm, at most one email per person per day, signed on your behalf.
            Legal deadlines are chased every day, weekends included.
            Pause anyone you&apos;d rather speak to yourself.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left align-bottom text-xs text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-card py-2 pr-4 font-medium">Person</th>
                  {columns.map((c) => (
                    <th key={c.code} title={c.title} className="px-1 pb-2 text-center font-normal">
                      <span className="inline-block max-w-16 leading-tight [writing-mode:vertical-rl] rotate-180">{c.ref.replace(/^Reg /, "")}</span>
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Last chased</th>
                  <th className="px-3 py-2 font-medium">Next reminder</th>
                  <th className="py-2 pl-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const mine = all.filter((i) => i.member_id === m.id);
                  const done = mine.filter((i) => i.status === "complete" || i.status === "submitted").length;
                  const last = (reminders ?? []).find((r) => r.member_id === m.id);
                  const chaseMember = state.members.find((x) => x.id === m.id)!;
                  const next = nextChase(state, chaseMember);
                  return (
                    <tr key={m.id} className="border-t align-middle">
                      <td className="sticky left-0 z-10 border-t bg-card py-2 pr-4">
                        <div className="font-medium">{nameOf(m)}</div>
                        <div className="text-xs text-muted-foreground">
                          {roleLabel(m.role)} · {done}/{mine.length}{m.is_owner && " · owner"}
                          {m.appointment_ended_on && ` · appointment ended ${shortDate(m.appointment_ended_on)}`}
                        </div>
                      </td>
                      {columns.map((c) => {
                        const item = mine.find((i) => i.template_code === c.code);
                        return (
                          <td key={c.code} className="border-t px-1 text-center">
                            {item && rag(item.status) === "red" && isWaiting(item.template_code, item.due_date) ? (
                              <span title={`${c.title}: not due yet`}
                                className="inline-block size-3 rounded-full border border-border bg-muted" />
                            ) : item ? (
                              <span title={`${c.title}: ${STATUS_LABELS[item.status]}${item.due_date ? `, due ${shortDate(item.due_date)}` : ""}`}
                                className={cn("inline-block size-3 rounded-full", DOT[rag(item.status)])} />
                            ) : (
                              <span className="text-muted-foreground/40">·</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="border-t px-3 text-xs">
                        {last ? (
                          <>
                            {shortDate(last.created_at)} · {KIND_LABEL[last.kind] ?? last.kind}
                            {last.status !== "sent" && <span className="block text-muted-foreground">not emailed</span>}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="border-t px-3 text-xs">
                        {next ? (
                          <>
                            {next.label}
                            {"when" in next && next.when && <span className="block text-muted-foreground">{shortDate(next.when)}</span>}
                          </>
                        ) : "—"}
                      </td>
                      <td className="border-t py-2 pl-3">
                        {!m.is_owner && (
                          <RowActions projectId={id} memberId={m.id} paused={m.chasing_paused}
                            canChase={Boolean(m.user_id || m.invited_at) && done < mine.length} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Hover a column heading or dot for the duty and its status.</p>
        </CardContent>
      </Card>

      {DEMO_ENABLED && project.is_demo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">Outbox <HelpLink topic="demo" /></CardTitle>
            <CardDescription>Every email the engine would have sent, word for word. Click one to read it.</CardDescription>
          </CardHeader>
          <CardContent>
            <Outbox entries={(reminders ?? []).filter((r) => r.simulated).map((r) => ({
              id: r.id,
              day: r.project_day,
              to: members.find((m) => m.id === r.member_id) ? nameOf(members.find((m) => m.id === r.member_id)!) : r.recipient_email,
              cc: r.cc_emails.map((e) => { const m = members.find((x) => x.email === e); return m ? nameOf(m) : e; }),
              kind: r.kind,
              subject: r.subject,
              body: r.body_text,
            }))} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
