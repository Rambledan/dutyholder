import { Suspense } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegenerateRecoveryCodes } from "@/components/home/regenerate-recovery-codes";
import { isFullySignedIn, requireAal2 } from "@/lib/auth/server";
import { parseAuthMode, safeNextPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";
import { Landing } from "@/components/landing/landing";
import { AuthDialog, type InviteCheck } from "@/components/auth/auth-dialog";
import { roleLabel } from "@/lib/labels";
import { AppFrame } from "@/components/nav/app-frame";
import { Invitations, type Invitation } from "@/components/account/invitations";
import { createDemo } from "./projects/demo-actions";
import { Term } from "@/components/help/term";
import { HelpLink } from "@/components/help/help-link";
import { DEMO_ENABLED } from "@/lib/features";

// Signed-out visitors get the landing page, with sign-in and sign-up in a
// lightbox over it. Fully signed-in people get their projects. (Anyone
// part-way through two-factor is sent to that step by the proxy first.)
export default function HomePage(props: PageProps<"/">) {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <Entry searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Entry({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  if (await isFullySignedIn()) {
    return (
      <AppFrame>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <Home />
        </Suspense>
      </AppFrame>
    );
  }
  const { auth, token, next } = await searchParams;
  return (
    <>
      <Landing />
      <AuthDialog invite={parseAuthMode(auth) === "signup" ? await checkInvite(token, next) : { status: "none" }} />
    </>
  );
}

// The database says whether the invite token is still good, and for whom.
async function checkInvite(token: unknown, next: unknown): Promise<InviteCheck> {
  if (typeof token !== "string" || !token) return { status: "none" };
  const supabase = await createClient();
  const { data } = await supabase.rpc("check_invite", { p_token: token });
  if (typeof data !== "string") return { status: "invalid" };
  return { status: "valid", email: data, token, next: safeNextPath(typeof next === "string" ? next : null) };
}

async function Home() {
  const { supabase, userId, email } = await requireAal2();

  // These reads go through RLS: they only succeed because the session is aal2.
  const [{ data: profile }, { data: remaining }, { data: projects }, { data: myRoles }, { data: invitations }] = await Promise.all([
    supabase.from("profiles").select("full_name, company").eq("id", userId).maybeSingle(),
    supabase.rpc("recovery_codes_remaining"),
    supabase.from("projects").select("id, name, address, is_demo").order("created_at", { ascending: false }),
    supabase.from("project_members").select("id, project_id, role, is_owner").eq("user_id", userId).is("removed_at", null),
    supabase.rpc("my_invitations"),
  ]);
  // Demo projects are hidden while the demo is switched off.
  const visibleProjects = (projects ?? []).filter((p) => DEMO_ENABLED || !p.is_demo);
  const { data: myItems } = myRoles?.length
    ? await supabase.from("checklist_items").select("project_id, status")
        .in("member_id", myRoles.map((r) => r.id)).is("withdrawn_at", null)
    : { data: [] };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-4xl font-medium tracking-[-0.03em] sm:text-[44px] sm:leading-[48px]">Hello{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
        <p className="text-[15px] text-muted-foreground">{email} · Your appointments, duties and competence records.</p>
      </header>

      {(invitations ?? []).length > 0 && (
        <Card className="border-warning/40 bg-warning-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">Invitations <HelpLink topic="partners" /></CardTitle>
            <CardDescription>Nothing about you is shared with a partner until you accept.</CardDescription>
          </CardHeader>
          <CardContent><Invitations invitations={(invitations ?? []) as Invitation[]} /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Your projects</CardTitle>
            <CardDescription>Projects you own or have a role on.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_ENABLED && (
              <form action={createDemo}>
                <Button type="submit" variant="outline">Try a demo</Button>
              </form>
            )}
            <Link href="/projects/new" className={buttonVariants()}>New project</Link>
          </div>
        </CardHeader>
        <CardContent>
          {visibleProjects.length ? (
            <ul className="divide-y divide-border">
              {visibleProjects.map((p) => {
                const roles = (myRoles ?? []).filter((r) => r.project_id === p.id);
                const items = (myItems ?? []).filter((i) => i.project_id === p.id);
                const done = items.filter((i) => i.status === "complete" || i.status === "submitted").length;
                const isOwner = roles.some((r) => r.is_owner);
                return (
                  <li key={p.id}>
                    <Link href={isOwner ? `/projects/${p.id}/dashboard` : `/projects/${p.id}/tasks`}
                      className="-mx-3 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-3 hover:bg-muted">
                      <span>
                        <span className="font-medium">{p.name}</span>
                        {p.address && <span className="block text-xs text-muted-foreground">{p.address}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {roles.map((r) => (r.role ? roleLabel(r.role) : "Owner")).join(", ")}
                        {roles.some((r) => r.is_owner) && roles.some((r) => r.role) ? " · Owner" : ""}
                        {items.length > 0 && ` · ${done} of ${items.length} tasks done`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No projects yet. Create one to get started.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">Security <HelpLink topic="two-factor" /></CardTitle>
          <CardDescription>Two-factor login is on for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <Term id="recovery-codes">Recovery codes</Term> left: <span className="font-medium">{typeof remaining === "number" ? remaining : "—"}</span>
          </p>
          <RegenerateRecoveryCodes />
        </CardContent>
      </Card>
    </div>
  );
}
