import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/projects/page-shell";
import { ReviewForm } from "@/components/review/review-form";
import { StatementView } from "@/components/tasks/competence-form";
import { requireAal2 } from "@/lib/auth/server";
import { STATUS_LABELS, roleLabel } from "@/lib/labels";
import { loadStatement } from "@/lib/statements";
import { HelpLink } from "@/components/help/help-link";

export const metadata = { title: "Review competence · Dutyholder" };

type Params = PageProps<"/projects/[id]/review/[itemId]">["params"];

export default function ReviewPage(props: PageProps<"/projects/[id]/review/[itemId]">) {
  return (
    <PageShell>
      <Review params={props.params} />
    </PageShell>
  );
}

const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

async function Review({ params }: { params: Params }) {
  const { supabase, userId } = await requireAal2();
  const { id: projectId, itemId } = await params;

  const [{ data: isReviewer }, { data: item }] = await Promise.all([
    supabase.rpc("is_project_reviewer", { p_project_id: projectId }),
    supabase.from("checklist_items")
      .select("id, status, member_id, competence_statement_id, project_members(user_id, email, display_name, role, is_firm)")
      .eq("id", itemId).eq("project_id", projectId).eq("template_code", "ALL-11F-COMPETENCE").maybeSingle(),
  ]);
  if (!isReviewer || !item?.project_members) notFound();
  const member = item.project_members;

  const [{ data: profile }, statement, { data: reviews }, { data: changes }] = await Promise.all([
    member.user_id ? supabase.from("profiles").select("full_name").eq("id", member.user_id).maybeSingle() : { data: null },
    item.competence_statement_id ? loadStatement(supabase, item.competence_statement_id) : null,
    supabase.from("reviews").select("id, decision, note, created_at, statement_version, reviewer_id")
      .eq("checklist_item_id", itemId).order("created_at", { ascending: false }),
    supabase.from("competence_change_reports").select("id, note, created_at")
      .eq("member_id", item.member_id).order("created_at", { ascending: false }),
  ]);
  const name = profile?.full_name || member.display_name || member.email;
  const reviewerIds = [...new Set((reviews ?? []).map((r) => r.reviewer_id))];
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] };
  const backHref = `/projects/${projectId}`;
  const canDecide = item.status === "submitted" && member.user_id !== userId;

  return (
    <div className="space-y-4">
      <Link href={backHref} className="inline-block text-sm text-muted-foreground hover:underline">← Back to project</Link>
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reg 11E · {STATUS_LABELS[item.status]}
          </p>
          <CardTitle className="flex items-center gap-1.5 text-xl">Review competence: {name} <HelpLink topic="reviews" /></CardTitle>
          <CardDescription>
            {roleLabel(member.role)}{member.is_firm && " (firm)"}. The law asks whoever appoints them to take reasonable
            steps to be satisfied they are competent. Read the statement and evidence, then record your decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(changes ?? []).map((c) => (
            <div key={c.id} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
              <p className="font-medium">Change reported {fmt(c.created_at)}</p>
              <p className="whitespace-pre-line">{c.note}</p>
            </div>
          ))}

          {statement ? (
            <>
              <p className="text-sm text-muted-foreground">
                Version {statement.version}
                {statement.submittedAt && `, submitted ${fmt(statement.submittedAt)}`}
              </p>
              <StatementView statement={statement} isFirm={member.is_firm} projectId={projectId} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing has been submitted yet.</p>
          )}

          {canDecide && (
            <div className="border-t pt-6">
              <ReviewForm projectId={projectId} itemId={itemId} personName={name} backHref={backHref} />
            </div>
          )}
          {item.status === "needs_info" && (
            <p className="text-sm text-muted-foreground">Waiting for {name} to update their statement.</p>
          )}

          {(reviews ?? []).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="mb-2 text-sm font-medium">Review history</h3>
              <ul className="space-y-2 text-sm">
                {reviews!.map((r) => (
                  <li key={r.id} className="rounded-lg border p-3">
                    <span className="font-medium">{r.decision === "satisfied" ? "Satisfied" : "Needs more information"}</span>
                    {" · "}{reviewers?.find((p) => p.id === r.reviewer_id)?.full_name ?? "Reviewer"}
                    {" · "}{fmt(r.created_at)} · version {r.statement_version}
                    {r.note && <p className="mt-1 whitespace-pre-line text-muted-foreground">{r.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
