import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Invitations, type Invitation } from "@/components/account/invitations";
import { ProfileForm } from "@/components/account/profile-form";
import { HelpLink } from "@/components/help/help-link";
import { Term } from "@/components/help/term";
import { PageShell } from "@/components/projects/page-shell";
import { requireAal2 } from "@/lib/auth/server";
import { roleLabel, type DutyholderRole } from "@/lib/labels";

export const metadata = { title: "My details · Dutyholder" };

export default function AccountPage() {
  return (
    <PageShell back={{ href: "/", label: "Projects" }}>
      <Account />
    </PageShell>
  );
}

const day = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

async function Account() {
  const { supabase, userId, email } = await requireAal2();
  const [{ data: profile }, { data: invitations }, { data: partners }, { data: statements }] = await Promise.all([
    supabase.from("profiles").select("full_name, company, job_title, phone, memberships").eq("id", userId).maybeSingle(),
    supabase.rpc("my_invitations"),
    supabase.rpc("my_partners"),
    supabase.from("competence_statements").select("id, version, status, submitted_at, updated_at")
      .eq("user_id", userId).order("version", { ascending: false }),
  ]);

  // Group projects by the partner (project owner) who invited you.
  const groups = new Map<string, { name: string; company: string; projects: NonNullable<typeof partners> }>();
  for (const p of partners ?? []) {
    const own = p.owner_email === email.toLowerCase();
    const key = own ? "" : p.owner_email;
    if (!groups.has(key)) groups.set(key, own
      ? { name: "Your own projects", company: "", projects: [] }
      : { name: p.owner_name, company: p.owner_company, projects: [] });
    groups.get(key)!.projects.push(p);
  }
  const latest = (statements ?? []).find((s) => s.status === "submitted");
  const draft = (statements ?? []).find((s) => s.status === "draft");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-medium tracking-[-0.03em] sm:text-[44px] sm:leading-[48px]">My details</h1>
        <p className="text-sm text-muted-foreground">
          One sign-in for every project, whoever invites you. Save your details and competence statement here once, and
          reuse them on each project.
        </p>
      </header>

      {(invitations ?? []).length > 0 && (
        <Card id="invitations" className="scroll-mt-6 border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">Invitations <HelpLink topic="partners" /></CardTitle>
            <CardDescription>
              Nothing about you is shared with a partner until you accept their invitation.
            </CardDescription>
          </CardHeader>
          <CardContent><Invitations invitations={(invitations ?? []) as Invitation[]} /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>Shown to the people you work with on each project, and used on appointment letters.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm email={email} initial={{
            full_name: profile?.full_name ?? "", company: profile?.company ?? "", job_title: profile?.job_title ?? "",
            phone: profile?.phone ?? "", memberships: profile?.memberships ?? "",
          }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Term id="competence-passport">Competence passport</Term>
          </CardTitle>
          <CardDescription>
            Your competence statement and evidence, kept up to date in one place. When a project asks for it, you can use
            the latest version with one click.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {latest ? (
            <p>Latest version: <span className="font-medium">version {latest.version}</span>, saved {day(latest.submitted_at!)}.</p>
          ) : (
            <p className="text-muted-foreground">You haven&apos;t written one yet.</p>
          )}
          {draft && <p className="text-warning">You have unsaved changes (draft version {draft.version}).</p>}
          <Link href="/account/competence" className={buttonVariants()}>
            {latest || draft ? "View or update" : "Write your statement"}
          </Link>
          {(statements ?? []).filter((s) => s.status === "submitted").length > 1 && (
            <p className="text-xs text-muted-foreground">
              Earlier versions: {(statements ?? []).filter((s) => s.status === "submitted" && s.id !== latest?.id)
                .map((s) => `v${s.version} (${day(s.submitted_at!)})`).join(", ")}. Projects keep the version you gave them.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">Who you work with <HelpLink topic="partners" /></CardTitle>
          <CardDescription>The partners who&apos;ve invited you, and your projects with each.</CardDescription>
        </CardHeader>
        <CardContent>
          {groups.size === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <ul className="space-y-4">
              {[...groups.values()].map((g) => (
                <li key={g.name + g.company} className="rounded-lg border p-4">
                  <p className="font-medium">{g.name}</p>
                  {g.company && <p className="text-sm text-muted-foreground">{g.company}</p>}
                  <ul className="mt-2 divide-y text-sm">
                    {g.projects.map((p) => (
                      <li key={p.project_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <Link href={`/projects/${p.project_id}/tasks`} className="hover:underline">{p.project_name}</Link>
                        <span className="text-xs text-muted-foreground">
                          {p.my_roles.map((r) => (r === "owner" ? "Owner" : roleLabel(r as DutyholderRole))).join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
