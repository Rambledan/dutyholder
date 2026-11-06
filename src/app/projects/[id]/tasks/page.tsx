import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PageShell } from "@/components/projects/page-shell";
import { ProgressBar } from "@/components/tasks/progress-bar";
import { requireAal2 } from "@/lib/auth/server";
import { ITEM_TYPE_LABELS, STATUS_LABELS, rag } from "@/lib/labels";
import { KIND_LABELS, PARTY_LABELS } from "@/lib/letters";
import { loadMyTasks, nextTask, progress } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { londonParts, projectNow } from "@/lib/clock";
import { countdownLabel, daysLeft } from "@/lib/deadlines";
import { Term } from "@/components/help/term";
import { HelpLink } from "@/components/help/help-link";

export const metadata = { title: "Your tasks · Dutyholder" };

export default function TasksPage(props: PageProps<"/projects/[id]/tasks">) {
  return (
    <PageShell back={{ href: "/", label: "Projects" }}>
      <Tasks params={props.params} />
    </PageShell>
  );
}

const RAG_DOT = { red: "bg-destructive", amber: "bg-warning", green: "bg-success" };

async function Tasks({ params }: { params: PageProps<"/projects/[id]/tasks">["params"] }) {
  const { supabase, userId } = await requireAal2();
  const { id } = await params;

  const [{ data: project }, { tasks }] = await Promise.all([
    supabase.from("projects").select("id, name, address, clock_offset_days, is_demo, demo_started_at").eq("id", id).maybeSingle(),
    loadMyTasks(supabase, id, userId),
  ]);
  if (!project) notFound();

  const { done, total } = progress(tasks);
  const today = londonParts(projectNow(project)).date;
  const next = nextTask(tasks);

  // Letters this person must sign as appointee (they have no checklist item
  // for being appointed, so list them here).
  const myMemberIds = [...new Set(tasks.map((t) => t.memberId))];
  const { data: memberRows } = await supabase.from("project_members").select("id")
    .eq("project_id", id).eq("user_id", userId).is("removed_at", null);
  const allMine = [...new Set([...myMemberIds, ...(memberRows ?? []).map((m) => m.id)])];
  const { data: mySignatory } = allMine.length
    ? await supabase.from("appointment_signatories")
        .select("appointment_id, member_id, party, appointments!inner(id, kind, status, project_id)")
        .in("member_id", allMine).eq("appointments.status", "awaiting_signatures").eq("appointments.project_id", id)
    : { data: [] };
  const { data: mySigned } = mySignatory?.length
    ? await supabase.from("appointment_signatures").select("appointment_id, member_id, party")
        .in("appointment_id", mySignatory.map((s) => s.appointment_id))
    : { data: [] };
  const toSign = (mySignatory ?? []).filter(
    (s) => s.party === "appointee" &&
      !mySigned?.some((g) => g.appointment_id === s.appointment_id && g.member_id === s.member_id && g.party === s.party),
  );
  const hasCompetence = tasks.some((t) => t.code === "ALL-11F-COMPETENCE");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{project.name}</p>
        <h1 className="flex items-center gap-2 text-4xl font-medium tracking-[-0.03em] sm:text-[44px] sm:leading-[48px]">Your tasks <HelpLink topic="tasks" /></h1>
        <p className="text-sm text-muted-foreground">
          Your duties on this project under <Term id="part-2a">Part 2A of the Building Regulations</Term>. Most take a minute or two; the
          competence statement takes longest. Everything saves as you go.
        </p>
      </header>

      <ProgressBar done={done} total={total} />

      {toSign.length > 0 && (
        <div className="space-y-2 rounded-lg border border-warning/40 bg-warning-soft p-4">
          <h2 className="text-sm font-semibold">Waiting for your signature</h2>
          {toSign.map((s) => (
            <Link key={s.appointment_id} href={`/projects/${id}/appointments/${s.appointment_id}`}
              className={cn(buttonVariants({ size: "lg" }), "h-auto min-h-10 w-full whitespace-normal py-2 text-left sm:w-auto")}>
              {KIND_LABELS[s.appointments.kind]} (as {PARTY_LABELS[s.party].toLowerCase()}) →
            </Link>
          ))}
        </div>
      )}

      {next ? (
        <Link href={`/projects/${id}/tasks/${next.id}`} className={cn(buttonVariants({ size: "lg" }), "h-auto min-h-10 w-full whitespace-normal py-2 text-left sm:w-auto")}>
          {done === 0 ? "Start" : "Continue"}: {next.title}
        </Link>
      ) : total > 0 ? (
        <p className="rounded-lg border bg-success-soft p-4 text-sm text-success">
          You&apos;re done for now. You&apos;ll hear from the project team if anything else is needed.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">You have no tasks on this project.</p>
      )}

      <ul className="divide-y rounded-lg border">
        {tasks.map((t) => {
          const inner = (
            <>
              <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full",
                t.available ? RAG_DOT[rag(t.status)] : "border border-border bg-muted")} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {t.legalReference} · {ITEM_TYPE_LABELS[t.itemType]} ·{" "}
                  {t.available ? STATUS_LABELS[t.status] : "Not due yet"}
                </span>
              </span>
              {t.dueDate && t.status !== "complete" && t.status !== "submitted" && (
                <span className={cn("h-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  daysLeft(t.dueDate, today) <= 2 ? "bg-destructive-soft text-destructive" : "bg-warning-soft text-warning")}>
                  {countdownLabel(daysLeft(t.dueDate, today))}
                </span>
              )}
            </>
          );
          return (
            <li key={t.id}>
              <Link href={`/projects/${id}/tasks/${t.id}`}
                className={cn("flex gap-3 p-4 text-sm hover:bg-muted/50", !t.available && "text-muted-foreground")}>{inner}</Link>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href={`/projects/${id}`} className="text-muted-foreground hover:underline">Project details and team</Link>
        {hasCompetence && (
          <Link href={`/projects/${id}/report-change`} className="text-muted-foreground hover:underline">
            Report a change in your competence
          </Link>
        )}
      </div>
    </div>
  );
}
