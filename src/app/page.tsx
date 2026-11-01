import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegenerateRecoveryCodes } from "@/components/home/regenerate-recovery-codes";
import { requireAal2 } from "@/lib/auth/server";
import { signOut } from "./actions";

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
  const [{ data: profile }, { data: remaining }] = await Promise.all([
    supabase.from("profiles").select("full_name, company").eq("id", userId).maybeSingle(),
    supabase.rpc("recovery_codes_remaining"),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hello{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline">Sign out</Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Your projects</CardTitle>
          <CardDescription>Projects and your checklist of duties will appear here (phase 2).</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Two-factor login is on for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Recovery codes left: <span className="font-medium">{typeof remaining === "number" ? remaining : "—"}</span>
          </p>
          <RegenerateRecoveryCodes />
        </CardContent>
      </Card>
    </div>
  );
}
