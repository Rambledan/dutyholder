import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageShell } from "@/components/projects/page-shell";
import { HelpLink } from "@/components/help/help-link";
import { requireAal2 } from "@/lib/auth/server";
import { TONE_CLASSES, countRows, isSchedule1, requirementTone, sheetLabel, toneLabel } from "@/lib/tracker";
import { cn } from "@/lib/utils";
import { assignByDiscipline, markRelevant } from "../../tracker-actions";

export const metadata = { title: "Requirements tracker · Dutyholder" };

export default function TrackerPage(props: PageProps<"/projects/[id]/tracker">) {
  return (
    <PageShell back={{ href: ".", label: "Back to project" }}>
      <Tracker params={props.params} searchParams={props.searchParams} />
    </PageShell>
  );
}

async function Tracker({ params, searchParams }: {
  params: PageProps<"/projects/[id]/tracker">["params"];
  searchParams: PageProps<"/projects/[id]/tracker">["searchParams"];
}) {
  const { supabase, userId } = await requireAal2();
  const { id } = await params;
  const { view } = await searchParams;

  const [{ data: project }, { data: members }, { data: rows }, { data: isCoordinator }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("project_members").select("id, user_id, email, display_name").eq("project_id", id).is("removed_at", null),
    supabase.from("project_requirements")
      .select("id, relevance, status, owner_member_id, stage2_member_id, stage3_member_id, stage4_member_id, stage5_member_id, action_text, requirements(sheet, section, ref, provision, sort_order, requirement_text)")
      .eq("project_id", id),
    supabase.rpc("is_tracker_coordinator", { p_project_id: id }),
  ]);
  if (!project || !members || !rows) notFound();
  const myIds = members.filter((m) => m.user_id === userId).map((m) => m.id);
  if (!myIds.length) notFound();

  const userIds = members.map((m) => m.user_id).filter((u): u is string => Boolean(u));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameOf = (memberId: string | null) => {
    const m = members.find((x) => x.id === memberId);
    return m ? profiles?.find((p) => p.id === m.user_id)?.full_name || m.display_name || m.email : null;
  };

  const sorted = [...rows].sort((a, b) => (a.requirements?.sort_order ?? 0) - (b.requirements?.sort_order ?? 0));
  const isMine = (r: (typeof sorted)[number]) =>
    [r.owner_member_id, r.stage2_member_id, r.stage3_member_id, r.stage4_member_id, r.stage5_member_id]
      .some((x) => x && myIds.includes(x));
  const mine = sorted.filter(isMine);
  const showMine = view === "mine" || (view !== "all" && !isCoordinator);
  const visible = showMine ? mine : sorted;

  const sheets = [...new Set(sorted.map((r) => r.requirements?.sheet ?? ""))];
  const groups = sheets
    .map((sheet) => ({ sheet, rows: visible.filter((r) => r.requirements?.sheet === sheet) }))
    .filter((g) => g.rows.length);
  const totals = countRows(sorted);
  const unassigned = sorted.filter((r) => r.relevance !== "not_relevant" && !r.owner_member_id).length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{project.name}</p>
        <h1 className="flex items-center gap-2 text-4xl font-medium tracking-[-0.03em] sm:text-[44px] sm:leading-[48px]">
          {showMine ? "My requirements" : "Requirements tracker"} <HelpLink topic="tracker" />
        </h1>
        <p className="text-sm text-muted-foreground">
          The principal designer coordinates this tracker and relies on each designer&apos;s advice; they don&apos;t warrant
          another designer&apos;s design. Each answer is written by the designer responsible for it.
        </p>
      </header>

      <nav className="flex gap-2">
        <Link href={`/projects/${id}/tracker?view=mine`} className={buttonVariants({ variant: showMine ? "default" : "outline", size: "sm" })}>
          My requirements ({mine.length})
        </Link>
        <Link href={`/projects/${id}/tracker?view=all`} className={buttonVariants({ variant: showMine ? "outline" : "default", size: "sm" })}>
          Whole tracker ({sorted.length})
        </Link>
      </nav>

      {!showMine && (
        <Card>
          <CardHeader>
            <CardTitle>Status by Part</CardTitle>
            <CardDescription>
              {totals.toConfirm} to confirm · {unassigned} with no responsible designer · {totals.inProgress} in progress ·{" "}
              {totals.granted} granted · {totals.notRelevant} not relevant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead><TableHead className="text-right">To confirm</TableHead>
                    <TableHead className="text-right">Not started</TableHead><TableHead className="text-right">In progress</TableHead>
                    <TableHead className="text-right">Granted</TableHead><TableHead className="text-right">Not relevant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...sheets.filter(isSchedule1), ...sheets.filter((s) => !isSchedule1(s))].map((sheet) => {
                    const c = countRows(sorted.filter((r) => r.requirements?.sheet === sheet));
                    return (
                      <TableRow key={sheet}>
                        <TableCell><a href={`#${encodeURIComponent(sheet)}`} className="font-medium hover:underline">{sheetLabel(sheet)}</a></TableCell>
                        <TableCell className="text-right tabular-nums">{c.toConfirm || "·"}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.notStarted || "·"}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.inProgress || "·"}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.granted || "·"}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.notRelevant || "·"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {isCoordinator && (
              <form action={assignByDiscipline.bind(null, id)} className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="outline">Assign by discipline</Button>
                <span className="text-sm text-muted-foreground">
                  Fills in unassigned rows where exactly one team member has the usual discipline. You can change any of them.
                </span>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {showMine && mine.length === 0 && (
        <p className="text-sm text-muted-foreground">No requirements are assigned to you yet. The principal designer assigns them.</p>
      )}

      {groups.map((g) => {
        const toConfirm = g.rows.filter((r) => r.relevance === "to_confirm").map((r) => r.id);
        return (
          <Card key={g.sheet} id={encodeURIComponent(g.sheet)} className="scroll-mt-6">
            <CardHeader>
              <CardTitle className="text-base">{g.rows[0].requirements?.section}</CardTitle>
              <CardDescription>{g.rows.length} requirement{g.rows.length === 1 ? "" : "s"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="divide-y rounded-lg border text-sm">
                {g.rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/projects/${id}/tracker/${r.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{r.requirements?.provision}</span>
                        {/* The workbook repeats a provision's name for each paragraph, so show which one this is. */}
                        <span className="line-clamp-1 text-xs text-muted-foreground">{r.requirements?.requirement_text}</span>
                        <span className={cn("block text-xs", r.owner_member_id || r.relevance === "not_relevant" ? "text-muted-foreground" : "text-destructive")}>
                          {r.relevance === "not_relevant" ? "No answer needed" : nameOf(r.owner_member_id) ?? "No responsible designer"}
                          {r.action_text && ` · Action: ${r.action_text}`}
                        </span>
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", TONE_CLASSES[requirementTone(r.relevance, r.status)])}>
                        {toneLabel(r.relevance, r.status)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {isCoordinator && !showMine && toConfirm.length > 0 && (
                <form action={markRelevant.bind(null, id, toConfirm)}>
                  <Button type="submit" variant="outline" size="sm">
                    Mark the {toConfirm.length} unconfirmed as relevant
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
