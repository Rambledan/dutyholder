import { Suspense } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegenerateRecoveryCodes } from "@/components/home/regenerate-recovery-codes";
import { requireAal2 } from "@/lib/auth/server";
import { roleLabel } from "@/lib/labels";
import { signOut } from "./actions";
import { createDemo } from "./projects/demo-actions";
import { Term } from "@/components/help/term";
import { HelpLink } from "@/components/help/help-link";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const { supabase, userId, email } = await requireAal2();

  // These reads go through RLS: they only succeed because the session is aal2.
  const [{ data: profile }, { data: remaining }, { data: projects }, { data: myRoles }] = await Promise.all([
    supabase.from("profiles").select("full_name, company").eq("id", userId).maybeSingle(),
    supabase.rpc("recovery_codes_remaining"),
    supabase.from("projects").select("id, name, address").order("created_at", { ascending: false }),
    supabase.from("project_members").select("id, project_id, role, is_owner").eq("user_id", userId).is("removed_at", null),
  ]);
  const { data: myItems } = myRoles?.length
    ? await supabase.from("checklist_items").select("project_id, status")
        .in("member_id", myRoles.map((r) => r.id)).is("withdrawn_at", null)
    : { data: [] };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hello{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/help" className="text-sm text-muted-foreground hover:underline">Help</Link>
          <form action={signOut}>
            <Button type="submit" variant="outline">Sign out</Button>
          </form>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Your projects</CardTitle>
            <CardDescription>Projects you own or have a role on.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={createDemo}>
              <Button type="submit" variant="outline">Try a demo</Button>
            </form>
            <Link href="/projects/new" className={buttonVariants()}>New project</Link>
          </div>
        </CardHeader>
        <CardContent>
          {projects?.length ? (
            <ul className="divide-y">
              {projects.map((p) => {
                const roles = (myRoles ?? []).filter((r) => r.project_id === p.id);
                const items = (myItems ?? []).filter((i) => i.project_id === p.id);
                const done = items.filter((i) => i.status === "complete" || i.status === "submitted").length;
                const isOwner = roles.some((r) => r.is_owner);
                return (
                  <li key={p.id}>
                    <Link href={isOwner ? `/projects/${p.id}/dashboard` : `/projects/${p.id}/tasks`}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 hover:underline">
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
