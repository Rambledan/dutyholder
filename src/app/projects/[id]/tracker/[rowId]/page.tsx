import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/projects/page-shell";
import { ActionForm, AnswerForm, AssignForm, RelevanceForm } from "@/components/tracker/tracker-forms";
import { requireAal2 } from "@/lib/auth/server";
import { roleLabel } from "@/lib/labels";
import { APPROVED_DOCUMENTS_URL, RELEVANCE_LABELS, TONE_CLASSES, requirementTone, routeLabel, statusLabel, toneLabel } from "@/lib/tracker";
import { cn } from "@/lib/utils";
import { assignRow, saveAction, saveAnswer, setRelevance } from "../../../tracker-actions";

export const metadata = { title: "Requirement · Dutyholder" };

export default function RequirementPage(props: PageProps<"/projects/[id]/tracker/[rowId]">) {
  return (
    <PageShell>
      <Requirement params={props.params} />
    </PageShell>
  );
}

function Read({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="whitespace-pre-line text-sm">{value || "—"}</p>
    </div>
  );
}

async function Requirement({ params }: { params: PageProps<"/projects/[id]/tracker/[rowId]">["params"] }) {
  const { supabase, userId } = await requireAal2();
  const { id, rowId } = await params;

  const [{ data: row }, { data: members }, { data: isCoordinator }] = await Promise.all([
    supabase.from("project_requirements").select("*, requirements(*)").eq("id", rowId).eq("project_id", id).maybeSingle(),
    supabase.from("project_members").select("id, user_id, email, display_name, role").eq("project_id", id).is("removed_at", null).order("created_at"),
    supabase.rpc("is_tracker_coordinator", { p_project_id: id }),
  ]);
  const req = row?.requirements;
  if (!row || !req || !members) notFound();

  const userIds = members.map((m) => m.user_id).filter((u): u is string => Boolean(u));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameOf = (m: (typeof members)[number]) =>
    profiles?.find((p) => p.id === m.user_id)?.full_name || m.display_name || m.email;
  const name = (memberId: string | null) => {
    const m = members.find((x) => x.id === memberId);
    return m ? nameOf(m) : "";
  };
  const people = members.filter((m) => m.role).map((m) => ({ id: m.id, label: `${nameOf(m)} · ${roleLabel(m.role)}` }));

  const myIds = members.filter((m) => m.user_id === userId).map((m) => m.id);
  const responsible = [row.owner_member_id, row.stage2_member_id, row.stage3_member_id, row.stage4_member_id, row.stage5_member_id]
    .some((x) => x && myIds.includes(x));
  const notRelevant = row.relevance === "not_relevant";
  const tone = requirementTone(row.relevance, row.status);

  return (
    <div className="space-y-4">
      <Link href={`/projects/${id}/tracker`} className="inline-block text-sm text-muted-foreground hover:underline">← Tracker</Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{req.section}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", TONE_CLASSES[tone])}>{toneLabel(row.relevance, row.status)}</span>
          </div>
          <CardTitle className="text-xl">{req.provision}</CardTitle>
          {req.heading && <p className="text-sm text-muted-foreground">{req.heading}</p>}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-line rounded-lg border bg-muted/40 p-4 font-serif text-[15px] leading-relaxed">{req.requirement_text}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {req.legislation_url && (
              <a href={req.legislation_url} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                Read it on legislation.gov.uk
              </a>
            )}
            {req.approved_document && (
              <a href={APPROVED_DOCUMENTS_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                {req.approved_document} on gov.uk
              </a>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Is it relevant to this project?</CardTitle></CardHeader>
        <CardContent>
          {isCoordinator ? (
            <RelevanceForm action={setRelevance.bind(null, id, rowId)} relevance={row.relevance} reason={row.relevance_reason} />
          ) : (
            <div className="space-y-2">
              <Read label="Decision" value={RELEVANCE_LABELS[row.relevance]} />
              {notRelevant && <Read label="Reason" value={row.relevance_reason} />}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Who is responsible</CardTitle></CardHeader>
        <CardContent>
          {isCoordinator ? (
            <AssignForm action={assignRow.bind(null, id, rowId)} people={people} owner={row.owner_member_id}
              stage2={row.stage2_member_id} stage3={row.stage3_member_id} stage4={row.stage4_member_id} stage5={row.stage5_member_id} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Read label="Responsible designer" value={name(row.owner_member_id)} />
              <Read label="Stage 2" value={name(row.stage2_member_id)} />
              <Read label="Stage 3" value={name(row.stage3_member_id)} />
              <Read label="Stage 4" value={name(row.stage4_member_id)} />
              <Read label="Stage 5 (construction)" value={name(row.stage5_member_id)} />
            </div>
          )}
        </CardContent>
      </Card>

      {!notRelevant && (
        <Card>
          <CardHeader><CardTitle className="text-base">The answer</CardTitle></CardHeader>
          <CardContent>
            {responsible ? (
              <AnswerForm action={saveAnswer.bind(null, id, rowId)} route={row.route} guidance={row.guidance}
                standardBasis={row.standard_basis} projectApplication={row.project_application} notes={row.notes} status={row.status} />
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Read label="Route to compliance" value={routeLabel(row.route)} />
                  <Read label="Submission status" value={statusLabel(row.status)} />
                </div>
                <Read label="Design guidance followed" value={row.guidance} />
                <Read label="How this applies to this project" value={row.project_application} />
                <Read label="Standard basis" value={row.standard_basis} />
                <Read label="Notes and evidence references" value={row.notes} />
                <p className="text-xs text-muted-foreground">Only the designer responsible for this requirement can write its answer.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!notRelevant && (
        <Card>
          <CardHeader><CardTitle className="text-base">Action required</CardTitle></CardHeader>
          <CardContent>
            {isCoordinator || responsible ? (
              <ActionForm action={saveAction.bind(null, id, rowId)} people={people} text={row.action_text}
                member={row.action_member_id} due={row.action_due} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <Read label="Action" value={row.action_text} />
                <Read label="Who" value={name(row.action_member_id)} />
                <Read label="Due" value={row.action_due ?? ""} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Last updated {new Date(row.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" })}.
      </p>
    </div>
  );
}
