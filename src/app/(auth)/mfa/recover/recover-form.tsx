"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";
import { createClient } from "@/lib/supabase/client";

export function RecoverForm() {
  const router = useRouter();
  // Swap to the next page and re-run the server checks with the new session.
  const navigate = (path: string) => {
    router.replace(path);
    router.refresh();
  };
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: ok, error } = await supabase.rpc("use_recovery_code", { p_code: code });
    if (error || ok !== true) {
      setError("That recovery code didn't work. After 5 wrong tries you'll need to wait 15 minutes.");
      setBusy(false);
      return;
    }
    // The old authenticator has been removed. Refresh the session so it
    // knows, then set up a new one.
    await supabase.auth.refreshSession();
    navigate("/mfa/enrol");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Use a recovery code</CardTitle>
        <CardDescription>
          Enter one of the recovery codes you saved when you set up two-factor. Your old authenticator
          will be removed and you&apos;ll set up a new one straight away.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <FormError message={error} />
          <Label htmlFor="recovery">Recovery code</Label>
          <Input id="recovery" autoComplete="off" required placeholder="xxxx-xxxx-xxxx"
            className="font-mono" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Checking…" : "Use recovery code"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          No codes left? Contact the person who invited you so they can reset your two-factor.{" "}
          <Link href="/mfa/verify" className="text-primary underline-offset-4 hover:underline">Back</Link>
        </p>
      </CardContent>
    </Card>
  );
}
