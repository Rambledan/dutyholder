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

export const metadata = { title: "Project · Dutyholder" };

export default function ProjectPage(props: PageProps<"/projects/[id]">) {
  return (
    <PageShell back={{ href: "/", label: "Projects" }}>
      <Project params={props.params} />
    </PageShell>
  );
}

const RAG_CLASSES = {
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  green: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
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
      .select("id, user_id, email, display_name, role, discipline, is_firm, is_owner, created_at, invited_at")
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

  const activeItems = (items ?? []).filter((i) => !i.withdrawn_at);
  const myMemberIds = members.filter((m) => m.user_id === userId).map((m) => m.id);
  const myItems = activeItems.filter((i) => myMemberIds.includes(i.member_id));
  const myDone = myItems.filter((i) => i.status === "complete" || i.status === "submitted").length;
  const withdrawnCount = (items ?? []).length - activeItems.length;
  const visibleMembers = members.filter((m) => activeItems.some((i) => i.member_id === m.id));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.address && <p className="text-sm text-muted-foreground">{project.address}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {myItems.length > 0 && (
            <Link href={`/projects/${id}/tasks`} className={buttonVariants()}>
              Your tasks ({myDone} of {myItems.length} done)
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
          </dl>
          {project.description && <p className="mt-4 whitespace-pre-line text-sm">{project.description}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
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
                      ) : isOwner ? (
                        <InviteButton invitedAt={m.invited_at} invite={inviteMember.bind(null, id, m.id)} />
                      ) : (
                        <span className="text-muted-foreground">{m.invited_at ? "Invited" : "Not invited yet"}</span>
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

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{isOwner ? "Checklists" : "Your checklist"}</h2>
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
