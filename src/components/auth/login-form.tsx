"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormError } from "@/components/auth/form-error";
import { safeNextPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/client";

// Email and password. The two-factor step follows on its own page.
export function LoginForm({ onInvite }: { onInvite: () => void }) {
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
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 id="auth-title" className="text-2xl font-medium tracking-[-0.02em]">Welcome back</h2>
        <p className="text-sm text-muted-foreground">You&apos;ll be asked for a code from your authenticator app next.</p>
      </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {params.get("reason") === "timeout" && (
            <Alert>
              <AlertDescription>You were signed out after 12 hours of inactivity.</AlertDescription>
            </Alert>
          )}
          <FormError message={error} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" autoFocus required value={email}
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
          <p className="text-center text-sm text-muted-foreground">
            Been invited to a project?{" "}
            <button type="button" onClick={onInvite} className="font-medium text-foreground underline-offset-4 hover:underline">
              Create your account
            </button>
          </p>
        </form>
    </div>
  );
}
