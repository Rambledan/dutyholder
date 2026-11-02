import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddMemberForm } from "@/components/projects/add-member-form";
import { InviteButton } from "@/components/projects/invite-button";
import { PageShell } from "@/components/projects/page-shell";
import { requireAal2 } from "@/lib/auth/server";
import { DISCIPLINES, ITEM_TYPE_LABELS, STATUS_LABELS, rag, roleLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { addMember, inviteMember } from "../actions";
import { KIND_LABELS, type AppointmentKind } from "@/lib/letters";
import { HelpLink } from "@/components/help/help-link";

export const metadata = { title: "Project · Dutyholder" };

export default function ProjectPage(props: PageProps<"/projects/[id]">) {
  return (
    <PageShell back={{ href: "/", label: "Projects" }}>
      <Project params={props.params} />
    </PageShell>
  );
}

const RAG_CLASSES = {
  red: "bg-destructive-soft text-destructive",
  amber: "bg-warning-soft text-warning",
  green: "bg-success-soft text-success",
};

async function Project({ params }: { params: PageProps<"/projects/[id]">["params"] }) {
  const { supabase, userId } = await requireAal2();
  const { id } = await params;

  // Every read goes through RLS: a non-member gets nothing back, and a
  // non-owner only gets their own checklist items.
  const [{ data: project }, { data: members }, { data: items }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("project_members")
      .select("id, user_id, email, display_name, role, discipline, is_firm, is_owner, created_at, invited_at, declined_at")
      .eq("project_id", id)
      .is("removed_at", null)
      .order("created_at"),
    supabase
      .from("checklist_items")
      .select("id, member_id, status, withdrawn_at, duty_templates(code, title, legal_reference, item_type, sort_order)")
      .eq("project_id", id),
  ]);
  if (!project || !members) notFound();

  const isOwner = members.some((m) => m.user_id === userId && m.is_owner);
  const userIds = members.map((m) => m.user_id).filter((u): u is string => Boolean(u));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameOf = (m: (typeof members)[number]) =>
    profiles?.find((p) => p.id === m.user_id)?.full_name || m.display_name || m.email;

  const allActiveItems = (items ?? []).filter((i) => !i.withdrawn_at);
  const myMemberIds = members.filter((m) => m.user_id === userId).map((m) => m.id);
  const myItems = allActiveItems.filter((i) => myMemberIds.includes(i.member_id));
  // Reviewers can also see others' competence items; the checklist section
  // still shows only your own unless you're the owner.
  const activeItems = isOwner ? allActiveItems : myItems;
  const competenceItems = allActiveItems.filter((i) => i.duty_templates?.code === "ALL-11F-COMPETENCE");

  const [{ data: isReviewer }, { data: appointments }] = await Promise.all([
    supabase.rpc("is_project_reviewer", { p_project_id: id }),
    supabase.from("appointments").select("id, kind, status, created_at").eq("project_id", id).order("created_at"),
  ]);
  const kinds: AppointmentKind[] = project.expected_contractors > 1
    ? ["pd_appointment", "pc_appointment", ...(project.cdm_pd_certified ? ["cdm_certification" as const] : [])]
    : ["lead_designer_agreement"];
  const myDone = myItems.filter((i) => i.status === "complete" || i.status === "submitted").length;
  const withdrawnCount = isOwner ? (items ?? []).length - allActiveItems.length : 0;
  const visibleMembers = members.filter((m) => activeItems.some((i) => i.member_id === m.id));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-medium tracking-[-0.03em] sm:text-[44px] sm:leading-[48px]">{project.name}</h1>
          {project.address && <p className="text-sm text-muted-foreground">{project.address}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {myItems.length > 0 && (
            <Link href={`/projects/${id}/tasks`} className={buttonVariants()}>
              Your tasks ({myDone} of {myItems.length} done)
            </Link>
          )}
          {isOwner && (
            <Link href={`/projects/${id}/dashboard`} className={buttonVariants({ variant: "outline" })}>
              Dashboard
            </Link>
          )}
          {isOwner && (
            <Link href={`/projects/${id}/exports`} className={buttonVariants({ variant: "outline" })}>
              Evidence pack
            </Link>
          )}
          {isOwner && (
            <Link href={`/projects/${id}/edit`} className={buttonVariants({ variant: "outline" })}>
              Edit set-up
            </Link>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Set-up</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Fact label="Jurisdiction" value="England" />
            <Fact label="Domestic client"
              value={project.is_domestic_client
                ? project.domestic_duties_to_pd ? "Yes — principal designer takes on client duties" : "Yes — contractor side takes on client duties"
                : "No"} />
            <Fact label="Contractors" value={project.expected_contractors === 1 ? "Only one" : "More than one"} />
            <Fact label="CDM principal designer certification" value={project.cdm_pd_certified ? "Yes" : "No"} />
            <Fact label="Higher-risk" value="No" />
            <Fact label="Records kept for" value={`${project.retention_years} years after the project`} />
            <Fact label="Construction starts"
              value={project.construction_start_date
                ? new Date(project.construction_start_date).toLocaleDateString("en-GB", { dateStyle: "long" })
                : "Not set"} />
          </dl>
          {project.description && <p className="mt-4 whitespace-pre-line text-sm">{project.description}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">Team <HelpLink topic="roles" /></CardTitle>
          <CardDescription>Everyone on the project can see this list.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Discipline</TableHead>
                  <TableHead>Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">{nameOf(m)}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </TableCell>
                    <TableCell>
                      {roleLabel(m.role)}
                      {m.is_firm && <span className="text-muted-foreground"> (firm)</span>}
                      {m.is_owner && <Badge variant="secondary" className="ml-2">Owner</Badge>}
                    </TableCell>
                    <TableCell>{DISCIPLINES.find((d) => d.value === m.discipline)?.label ?? "—"}</TableCell>
                    <TableCell>
                      {m.user_id ? (
                        "Joined"
                      ) : (
                        <div className="space-y-1">
                          {m.declined_at && <span className="block text-xs font-medium text-destructive">Declined</span>}
                          {!m.declined_at && m.invited_at && <span className="block text-xs text-muted-foreground">Invited, not accepted yet</span>}
                          {isOwner ? (
                            <InviteButton invitedAt={m.invited_at} invite={inviteMember.bind(null, id, m.id)} />
                          ) : !m.invited_at && !m.declined_at ? (
                            <span className="text-muted-foreground">Not invited yet</span>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {isOwner && (
            <div className="border-t pt-6">
              <h3 className="mb-1 font-medium">Add a team member</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Their checklist is created straight away. Then click Invite next to their name.
              </p>
              <AddMemberForm action={addMember.bind(null, id)} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">Appointments <HelpLink topic="principal-appointments" /></CardTitle>
          <CardDescription>Written appointments and agreements under reg 11D. Everyone on the project can see these.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-lg border text-sm">
            {kinds.map((kind) => {
              const live = appointments?.find((a) => a.kind === kind && a.status !== "void");
              const voided = appointments?.filter((a) => a.kind === kind && a.status === "void").length ?? 0;
              return (
                <li key={kind} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span>
                    <span className="font-medium">{KIND_LABELS[kind]}</span>
                    <span className="block text-xs text-muted-foreground">
                      {live ? (live.status === "signed" ? "Signed by all parties" : "Waiting for signatures") : "Not issued yet"}
                      {voided > 0 && ` · ${voided} voided`}
                    </span>
                  </span>
                  {live ? (
                    <Link href={`/projects/${id}/appointments/${live.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Open
                    </Link>
                  ) : isOwner ? (
                    <Link href={`/projects/${id}/appointments/new?kind=${kind}`} className={buttonVariants({ size: "sm" })}>
                      Prepare
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {isReviewer && competenceItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">Competence reviews <HelpLink topic="reviews" /></CardTitle>
            <CardDescription>Review each person&apos;s competence statement and evidence (reg 11E).</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border text-sm">
              {competenceItems.map((i) => {
                const m = members.find((x) => x.id === i.member_id);
                if (!m) return null;
                return (
                  <li key={i.id}>
                    <Link href={`/projects/${id}/review/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/50">
                      <span>
                        <span className="font-medium">{nameOf(m)}</span>
                        <span className="text-muted-foreground"> · {roleLabel(m.role)}</span>
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RAG_CLASSES[rag(i.status)])}>
                        {i.status === "submitted" ? "Ready to review" : STATUS_LABELS[i.status]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            {isOwner ? "Checklists" : "Your checklist"} <HelpLink topic="statuses" />
          </h2>
          <p className="text-sm text-muted-foreground">
            {isOwner ? "Each person's duties under Part 2A." : "Your duties on this project under Part 2A."}
            {withdrawnCount > 0 && ` ${withdrawnCount} item(s) withdrawn after set-up changes are kept on record.`}
          </p>
        </div>
        {visibleMembers.length === 0 && (
          <p className="text-sm text-muted-foreground">No checklist items yet.</p>
        )}
        {visibleMembers.map((m) => {
          const memberItems = activeItems
            .filter((i) => i.member_id === m.id)
            .sort((a, b) => (a.duty_templates?.sort_order ?? 0) - (b.duty_templates?.sort_order ?? 0));
          return (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle className="text-base">{nameOf(m)}</CardTitle>
                <CardDescription>
                  {roleLabel(m.role)} · {memberItems.length} item{memberItems.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {memberItems.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <div className="min-w-0">
                        <div>{i.duty_templates?.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {i.duty_templates?.legal_reference} · {i.duty_templates && ITEM_TYPE_LABELS[i.duty_templates.item_type]}
                        </div>
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RAG_CLASSES[rag(i.status)])}>
                        {STATUS_LABELS[i.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
