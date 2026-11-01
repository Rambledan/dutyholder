"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormError } from "@/components/auth/form-error";
import { safeNextPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  // Swap to the next page and re-run the server checks with the new session.
  const navigate = (path: string) => {
    router.replace(path);
    router.refresh();
  };
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("That email and password didn't match. Please try again.");
      setBusy(false);
      return;
    }
    // A full page load lets the proxy send them to the two-factor step.
    navigate(safeNextPath(params.get("next")));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>You&apos;ll be asked for a code from your authenticator app next.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {params.get("reason") === "timeout" && (
            <Alert>
              <AlertDescription>You were signed out after 12 hours of inactivity.</AlertDescription>
            </Alert>
          )}
          <FormError message={error} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Accounts are by invitation only. Ask your project&apos;s principal designer for an invite.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
