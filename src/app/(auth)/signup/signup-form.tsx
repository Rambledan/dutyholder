"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 12;

export function SignupForm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  // Swap to the next page and re-run the server checks with the new session.
  const navigate = (path: string) => {
    router.replace(path);
    router.refresh();
  };
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("The two passwords don't match.");

    setBusy(true);
    const supabase = createClient();
    // The database checks the invite token before it will create the account.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { invite_token: token, full_name: fullName.trim() } },
    });
    if (error) {
      setError(
        error.message.toLowerCase().includes("database error")
          ? "This invite is no longer valid. Ask for a new one."
          : error.message,
      );
      setBusy(false);
      return;
    }
    if (!data.session) {
      // Supabase is set to confirm email addresses first.
      setCheckEmail(true);
      return;
    }
    navigate("/mfa/enrol");
  }

  if (checkEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>We&apos;ve sent a confirmation link to {email}. Open it, then sign in.</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          You&apos;ve been invited to record your Building Regulations dutyholder information.
          After this you&apos;ll set up two-factor login on your phone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={error} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} readOnly disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" autoComplete="name" required value={fullName}
              onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" required value={confirm}
              onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Privacy notice (draft)</p>
            <p>
              We collect your name, contact details and the competence information you choose to submit, so
              the project team can meet its legal duties under Part 2A of the Building Regulations 2010. Only
              people on your projects can see it. Records are kept for the period agreed for each project.
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" required checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)} />
            <span>I have read the privacy notice.</span>
          </label>
          <Button type="submit" className="w-full" disabled={busy || !accepted}>
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
