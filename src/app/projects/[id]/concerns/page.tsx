import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/projects/page-shell";
import { HelpLink } from "@/components/help/help-link";
import { RaiseConcernForm, RespondForm } from "@/components/concerns/concern-forms";
import { requireAal2 } from "@/lib/auth/server";
import { CONCERN_KINDS, canRespond, effectiveRoles, isConcernKind, kindsICanRaise } from "@/lib/concerns";
import { cn } from "@/lib/utils";
import { raiseConcern, respondToConcern } from "../../concern-actions";

export const metadata = { title: "Concerns · Dutyholder" };

export default function ConcernsPage(props: PageProps<"/projects/[id]/concerns">) {
  return (
    <PageShell back={{ href: ".", label: "Back to project" }}>
      <Concerns params={props.params} />
    </PageShell>
  );
}

const when = (d: string) =>
  new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

async function Concerns({ params }: { params: PageProps<"/projects/[id]/concerns">["params"] }) {
  const { supabase, userId } = await requireAal2();
  const { id } = await params;

  // RLS shows each person only the concerns they may see.
  const [{ data: project }, { data: members }, { data: concerns }, { data: responses }] = await Promise.all([
    supabase.from("projects").select("id, name, expected_contractors").eq("id", id).maybeSingle(),
    supabase.from("project_members").select("id, user_id, email, display_name, role, is_owner")
      .eq("project_id", id).is("removed_at", null),
    supabase.from("concerns").select("id, kind, subject, body, raised_by_member_id, created_at")
      .eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("concern_responses").select("id, concern_id, responder_member_id, body, created_at").order("created_at"),
  ]);
  if (!project || !members) notFound();
  const mine = members.filter((m) => m.user_id === userId);
  if (!mine.length) notFound();

  const userIds = members.map((m) => m.user_id).filter((u): u is string => Boolean(u));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameOf = (memberId: string | null) => {
    const m = members.find((x) => x.id === memberId);
    return m ? profiles?.find((p) => p.id === m.user_id)?.full_name || m.display_name || m.email : "Former member";
  };

  const myRoles = effectiveRoles(mine.map((m) => m.role), project.expected_contractors);
  const isOwner = mine.some((m) => m.is_owner);
  const raisable = kindsICanRaise(myRoles, project.expected_contractors);
  const list = (concerns ?? []).filter((c) => isConcernKind(c.kind));
  const open = list.filter((c) => !responses?.some((r) => r.concern_id === c.id)).length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{project.name}</p>
        <h1 className="flex items-center gap-2 text-4xl font-medium tracking-[-0.03em] sm:text-[44px] sm:leading-[48px]">
          Concerns <HelpLink topic="concerns" />
        </h1>
        <p className="text-sm text-muted-foreground">
          Designers report concerns about related design to the principal designer (reg 11K(4)); contractors report
          concerns about related work to the principal contractor (reg 11L(4)); the principal designer and principal
          contractor comment to each other (regs 11M(4), 11N(4)). Each one needs a recorded response, and all of it goes
          in the evidence pack.
        </p>
      </header>

      {raisable.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Raise a concern</CardTitle>
          </CardHeader>
          <CardContent>
            <RaiseConcernForm kinds={raisable} action={raiseConcern.bind(null, id)} />
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {list.length ? `${list.length} on record${open ? `, ${open} waiting for a response` : ""}` : "Nothing raised yet"}
        </h2>
        {!isOwner && !myRoles.some((r) => r === "principal_designer" || r === "principal_contractor") && (
          <p className="text-sm text-muted-foreground">You see the concerns you&apos;ve raised.</p>
        )}
        {list.map((c) => {
          const kind = isConcernKind(c.kind) ? c.kind : "design_concern";
          const info = CONCERN_KINDS[kind];
          const thread = (responses ?? []).filter((r) => r.concern_id === c.id);
          return (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {info.label} · {info.reg} · to the {info.toLabel}
                  </p>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                    thread.length ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
                    {thread.length ? "Responded" : "Waiting for a response"}
                  </span>
                </div>
                <CardTitle className="text-base">{c.subject}</CardTitle>
                <CardDescription>Raised by {nameOf(c.raised_by_member_id)} · {when(c.created_at)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="whitespace-pre-line">{c.body}</p>
                {thread.map((r) => (
                  <div key={r.id} className="rounded-lg border bg-muted/40 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">{nameOf(r.responder_member_id)} · {when(r.created_at)}</p>
                    <p className="whitespace-pre-line">{r.body}</p>
                  </div>
                ))}
                {canRespond(kind, myRoles, isOwner) && (
                  <RespondForm id={c.id} action={respondToConcern.bind(null, id, c.id)} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
