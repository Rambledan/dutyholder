import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/projects/page-shell";
import { AcknowledgeForm } from "@/components/tasks/acknowledge-form";
import { CompetenceForm, StatementView, type Statement } from "@/components/tasks/competence-form";
import type { FileRow } from "@/components/tasks/file-list";
import { SimpleForm } from "@/components/tasks/simple-form";
import { UploadTask } from "@/components/tasks/upload-task";
import { requireAal2 } from "@/lib/auth/server";
import { STATUS_LABELS } from "@/lib/labels";
import type { Database } from "@/lib/supabase/database.types";
import { loadMyTasks, nextTask } from "@/lib/tasks";

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

async function loadStatement(supabase: SupabaseClient<Database>, id: string): Promise<Statement | null> {
  const [{ data: s }, { data: links }] = await Promise.all([
    supabase.from("competence_statements").select("*").eq("id", id).maybeSingle(),
    supabase.from("competence_evidence")
      .select("documents(id, file_name, size_bytes, sha256, withdrawn_at, created_at)")
      .eq("statement_id", id),
  ]);
  if (!s) return null;
  const files: FileRow[] = (links ?? [])
    .map((l) => l.documents)
    .filter((d): d is NonNullable<typeof d> => Boolean(d) && !d!.withdrawn_at)
    .map((d) => ({ id: d.id, fileName: d.file_name, sizeBytes: d.size_bytes, sha256: d.sha256, createdAt: d.created_at }));
  return {
    skills: s.skills,
    knowledge: s.knowledge,
    experience: s.experience,
    behaviour_compliance: s.behaviour_compliance,
    behaviour_cooperation: s.behaviour_cooperation,
    behaviour_limits: s.behaviour_limits,
    organisational_capability: s.organisational_capability,
    has_serious_sanctions: s.has_serious_sanctions,
    sanctions_details: s.sanctions_details,
    version: s.version,
    submittedAt: s.submitted_at,
    files,
  };
}

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
    if (item.competence_statement_id) {
      const linked = await loadStatement(supabase, item.competence_statement_id);
      body = linked && (
        <div className="space-y-4">
          <p className="text-sm">
            Version {linked.version} submitted
            {linked.submittedAt && ` on ${new Date(linked.submittedAt).toLocaleDateString("en-GB", { dateStyle: "long" })}`}.
            It&apos;s waiting for review.
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
      body = (
        <CompetenceForm projectId={projectId} itemId={itemId} userId={userId} isFirm={Boolean(member?.is_firm)}
          isHigherRisk={project.is_higher_risk} draft={draft} latestSubmitted={latestSubmitted} nextHref={nextHref} />
      );
    }
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
          <CardTitle className="text-xl">{task.title}</CardTitle>
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
