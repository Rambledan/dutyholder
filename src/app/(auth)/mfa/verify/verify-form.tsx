"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CodeInput } from "@/components/auth/code-input";
import { FormError } from "@/components/auth/form-error";
import { signOut } from "@/app/actions";
import { safeNextPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/client";

export function VerifyForm() {
  const router = useRouter();
  // Swap to the next page and re-run the server checks with the new session.
  const navigate = (path: string) => {
    router.replace(path);
    router.refresh();
  };
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (listError || !factor) {
      navigate("/mfa/enrol");
      return;
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) {
      setError("That code didn't work. Try the newest code in your app.");
      setCode("");
      setBusy(false);
      return;
    }
    navigate(safeNextPath(params.get("next")));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter your two-factor code</CardTitle>
        <CardDescription>Open your authenticator app and type the 6-digit code for Dutyholder.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <FormError message={error} />
          <Label htmlFor="code">Code</Label>
          <CodeInput value={code} onChange={setCode} />
          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Continue"}
          </Button>
        </form>
        <div className="flex items-center justify-between text-sm">
          <Link href="/mfa/recover" className="text-primary underline-offset-4 hover:underline">
            Lost your phone? Use a recovery code
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="link" size="sm" className="px-0">Sign out</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
