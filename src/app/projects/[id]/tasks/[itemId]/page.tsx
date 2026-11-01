import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/projects/page-shell";
import { AcknowledgeForm } from "@/components/tasks/acknowledge-form";
import { CompetenceForm, StatementView } from "@/components/tasks/competence-form";
import type { FileRow } from "@/components/tasks/file-list";
import { SimpleForm } from "@/components/tasks/simple-form";
import { UploadTask } from "@/components/tasks/upload-task";
import { requireAal2 } from "@/lib/auth/server";
import { STATUS_LABELS } from "@/lib/labels";
import { loadStatement } from "@/lib/statements";
import { KIND_BY_CODE, KIND_LABELS } from "@/lib/letters";
import { loadMyTasks, nextTask } from "@/lib/tasks";
import { buttonVariants } from "@/components/ui/button";
import { HelpLink } from "@/components/help/help-link";

export const metadata = { title: "Task · Dutyholder" };

type Params = PageProps<"/projects/[id]/tasks/[itemId]">["params"];

export default function TaskPage(props: PageProps<"/projects/[id]/tasks/[itemId]">) {
  return (
    <PageShell>
      <TaskView params={props.params} />
    </PageShell>
  );
}

// What each simple form asks for.
const FORM_PROMPTS: Record<string, string> = {
  "CL-11A-PROGRAMME": "Describe the time and resources allowed for design and construction.",
  "CL-11O-NOTIFY": "Record the notification: which building control body, the date you notified them, and any reference.",
  "PD-11G-INDIVIDUAL": "Name the individual who will manage the principal designer role, and their position in the firm.",
  "PD-11M-MATRIX": "List each part of the design and the designer responsible for it.",
  "PD-11M-HANDOVER": "Explain the arrangements you made to plan, manage and monitor the design work.",
};

async function TaskView({ params }: { params: Params }) {
  const { supabase, userId } = await requireAal2();
  const { id: projectId, itemId } = await params;

  const [{ data: project }, { tasks, members }, { data: item }, { data: profile }] = await Promise.all([
    supabase.from("projects").select("id, name, is_higher_risk").eq("id", projectId).maybeSingle(),
    loadMyTasks(supabase, projectId, userId),
    supabase.from("checklist_items").select("answer, competence_statement_id").eq("id", itemId).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  const task = tasks.find((t) => t.id === itemId);
  if (!project || !task || !item) notFound();

  const member = members.find((m) => m.id === task.memberId);
  const next = nextTask(tasks, task.id);
  const nextHref = next ? `/projects/${projectId}/tasks/${next.id}` : `/projects/${projectId}/tasks`;
  const done = task.status === "complete" || task.status === "submitted";

  let body: React.ReactNode;
  if (!task.available) {
    body = <p className="text-sm text-muted-foreground">This step arrives in the next release.</p>;
  } else if (task.itemType === "acknowledge") {
    if (done) {
      const { data: sig } = await supabase.from("signatures")
        .select("typed_name, signed_at, statement_sha256").eq("checklist_item_id", itemId).maybeSingle();
      body = sig ? (
        <p className="text-sm">
          Signed by <strong>{sig.typed_name}</strong> on{" "}
          {new Date(sig.signed_at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}.
          <span className="mt-1 block font-mono text-xs text-muted-foreground">Wording fingerprint {sig.statement_sha256.slice(0, 16)}…</span>
        </p>
      ) : null;
    } else {
      body = <AcknowledgeForm projectId={projectId} itemId={itemId} fullName={profile?.full_name ?? ""} nextHref={nextHref} />;
    }
  } else if (task.code === "ALL-11F-COMPETENCE") {
    if (item.competence_statement_id && (task.status === "submitted" || task.status === "complete")) {
      const linked = await loadStatement(supabase, item.competence_statement_id);
      body = linked && (
        <div className="space-y-4">
          <p className="text-sm">
            Version {linked.version} submitted
            {linked.submittedAt && ` on ${new Date(linked.submittedAt).toLocaleDateString("en-GB", { dateStyle: "long" })}`}.
            {task.status === "complete" ? " Reviewed and accepted." : " It's waiting for review."}
          </p>
          <StatementView statement={linked} isFirm={Boolean(member?.is_firm)} projectId={projectId} />
        </div>
      );
    } else {
      const [{ data: draftRow }, { data: latestRow }] = await Promise.all([
        supabase.from("competence_statements").select("id").eq("user_id", userId).eq("status", "draft").maybeSingle(),
        supabase.from("competence_statements").select("id").eq("user_id", userId).eq("status", "submitted")
          .order("version", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const [draft, latestSubmitted] = await Promise.all([
        draftRow ? loadStatement(supabase, draftRow.id) : null,
        latestRow ? loadStatement(supabase, latestRow.id) : null,
      ]);
      // After "needs more info" (or a reported change) show why, and insist
      // on an updated version.
      const { data: lastReview } = task.status === "needs_info"
        ? await supabase.from("reviews").select("note, created_at").eq("checklist_item_id", itemId)
            .eq("decision", "needs_info").order("created_at", { ascending: false }).limit(1).maybeSingle()
        : { data: null };
      body = (
        <div className="space-y-4">
          {task.status === "needs_info" && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
              <p className="font-medium">More information needed</p>
              <p className="whitespace-pre-line">
                {lastReview?.note ?? "You reported a change in your competence. Please update your statement."}
              </p>
            </div>
          )}
          <CompetenceForm projectId={projectId} itemId={itemId} userId={userId} isFirm={Boolean(member?.is_firm)}
            isHigherRisk={project.is_higher_risk} draft={draft} latestSubmitted={latestSubmitted} nextHref={nextHref}
            mustRevise={task.status === "needs_info"} />
        </div>
      );
    }
  } else if (task.itemType === "sign") {
    const kind = KIND_BY_CODE[task.code];
    const [{ data: appointment }, { data: isOwner }] = await Promise.all([
      supabase.from("appointments").select("id, status, letter_title").eq("project_id", projectId).eq("kind", kind)
        .neq("status", "void").maybeSingle(),
      supabase.rpc("is_project_owner", { p_project_id: projectId }),
    ]);
    body = appointment ? (
      <div className="space-y-3 text-sm">
        <p>
          <strong>{appointment.letter_title}</strong>:{" "}
          {appointment.status === "signed" ? "signed by all parties." : "waiting for signatures."}
        </p>
        <Link href={`/projects/${projectId}/appointments/${appointment.id}`} className={buttonVariants({ size: "lg" })}>
          {appointment.status === "signed" ? "View the signed letter" : "Read and sign"}
        </Link>
      </div>
    ) : isOwner ? (
      <div className="space-y-3 text-sm">
        <p>The {KIND_LABELS[kind].toLowerCase()} hasn&apos;t been issued yet.</p>
        <Link href={`/projects/${projectId}/appointments/new?kind=${kind}`} className={buttonVariants({ size: "lg" })}>
          Prepare it now
        </Link>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">
        Waiting for the project owner to prepare the {KIND_LABELS[kind].toLowerCase()}. You&apos;ll be emailed when
        it&apos;s ready to sign.
      </p>
    );
  } else if (task.itemType === "review") {
    const roles: Record<string, string[]> = {
      "CL-11E-REVIEW-PD": ["principal_designer"],
      "CL-11E-REVIEW-PC": ["principal_contractor"],
      "CL-11E-REVIEW-ENGAGED": ["designer", "contractor"],
    };
    const { data: rows } = await supabase.from("checklist_items")
      .select("id, status, project_members!inner(user_id, email, display_name, role)")
      .eq("project_id", projectId).eq("template_code", "ALL-11F-COMPETENCE").is("withdrawn_at", null)
      .in("project_members.role", (roles[task.code] ?? []) as ("designer" | "contractor" | "principal_designer" | "principal_contractor")[]);
    const ids = (rows ?? []).map((r) => r.project_members.user_id).filter((x): x is string => Boolean(x));
    const { data: names } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
    body = rows?.length ? (
      <ul className="divide-y rounded-lg border text-sm">
        {rows.map((r) => {
          const m = r.project_members;
          const name = names?.find((n) => n.id === m.user_id)?.full_name || m.display_name || m.email;
          return (
            <li key={r.id}>
              <Link href={`/projects/${projectId}/review/${r.id}`} className="flex justify-between gap-2 p-3 hover:bg-muted/50">
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground">
                  {r.status === "submitted" ? "Ready to review →" : STATUS_LABELS[r.status]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="text-sm text-muted-foreground">Nobody to review yet. This completes itself once everyone is reviewed.</p>
    );
  } else if (task.itemType === "form") {
    const text = (item.answer as { text?: string } | null)?.text ?? "";
    body = done ? (
      <p className="whitespace-pre-line rounded-lg border bg-muted/40 p-3 text-sm">{text}</p>
    ) : (
      <SimpleForm projectId={projectId} itemId={itemId} initial={text} nextHref={nextHref}
        prompt={FORM_PROMPTS[task.code] ?? "Your answer"} />
    );
  } else if (task.itemType === "upload") {
    const { data: docs } = await supabase.from("documents")
      .select("id, file_name, size_bytes, sha256, created_at")
      .eq("checklist_item_id", itemId).is("withdrawn_at", null).order("created_at");
    const files: FileRow[] = (docs ?? []).map((d) => ({
      id: d.id, fileName: d.file_name, sizeBytes: d.size_bytes, sha256: d.sha256, createdAt: d.created_at,
    }));
    body = <UploadTask projectId={projectId} itemId={itemId} userId={userId} files={files}
      complete={task.status === "complete"} nextHref={nextHref} />;
  }

  return (
    <div className="space-y-4">
      <Link href={`/projects/${projectId}/tasks`} className="inline-block text-sm text-muted-foreground hover:underline">
        ← Your tasks · {project.name}
      </Link>
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {task.legalReference} · {STATUS_LABELS[task.status]}
          </p>
          <CardTitle className="flex items-start gap-1.5 text-xl">
            {task.title}
            <HelpLink className="mt-1" topic={
              task.code === "ALL-11F-COMPETENCE" ? "competence"
                : ({ acknowledge: "signatures", sign: "principal-appointments", review: "reviews", upload: "uploads" } as Record<string, string>)[task.itemType] ?? "tasks"
            } />
          </CardTitle>
          <CardDescription className="text-base">{task.explanation}</CardDescription>
          {task.legislationUrl && (
            <a href={task.legislationUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary underline-offset-4 hover:underline">
              Read {task.legalReference} on legislation.gov.uk
            </a>
          )}
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
      {done && (
        <Link href={nextHref} className="inline-block text-sm font-medium hover:underline">
          {next ? `Next: ${next.title} →` : "Back to your tasks →"}
        </Link>
      )}
    </div>
  );
}
