"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CodeInput } from "@/components/auth/code-input";
import { FormError } from "@/components/auth/form-error";
import { RecoveryCodes } from "@/components/auth/recovery-codes";
import { signOut } from "@/app/actions";
import { safeNextPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/client";

type Enrolment = { factorId: string; qrCode: string; secret: string };

const ABANDONED_AFTER_MS = 10 * 60 * 1000;

export function EnrolForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  // Swap to the next page and re-run the server checks with the new session.
  const navigate = (path: string) => {
    router.replace(path);
    router.refresh();
  };
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Each mount enrols its own factor and shows only that one. A mount that
    // is torn down first (React's double-run in development, a refresh)
    // removes its own unused factor.
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      // Clear out half-finished set-ups abandoned more than 10 minutes ago.
      // Recent ones are left alone: another copy of this page (a refresh, a
      // second tab) may be showing that QR code right now.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const cutoff = Date.now() - ABANDONED_AFTER_MS;
      for (const f of factors?.all ?? []) {
        if (f.status === "unverified" && new Date(f.created_at).getTime() < cutoff) {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        // Must be unique per user, so add a short random suffix.
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)} ${crypto.randomUUID().slice(0, 4)}`,
      });
      if (cancelled) {
        if (data) await supabase.auth.mfa.unenroll({ factorId: data.id });
        return;
      }
      if (error || !data) {
        setError(error?.message ?? "Couldn't start two-factor set-up. Refresh to try again.");
        return;
      }
      setEnrolment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolment) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolment.factorId, code });
    if (error) {
      setError(
        error.code === "mfa_factor_not_found"
          ? "This QR code has expired. Refresh the page to get a new one, and remove the old entry from your app."
          : "That code didn't work. Check your phone's clock is correct and try the newest code.",
      );
      setBusy(false);
      return;
    }
    // Tidy up any other half-finished set-ups now this one is verified.
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    // The session is now aal2: record it and issue recovery codes.
    await supabase.rpc("record_mfa_enrolled");
    const { data: codes, error: codesError } = await supabase.rpc("generate_recovery_codes");
    if (codesError || !Array.isArray(codes)) {
      // 2FA is working; codes can be generated again from the home page.
      navigate(next);
      return;
    }
    setRecoveryCodes(codes as string[]);
    setBusy(false);
  }

  if (recoveryCodes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save your recovery codes</CardTitle>
          <CardDescription>
            If you lose your phone, each of these codes lets you back in once. This is the only time
            they&apos;ll be shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RecoveryCodes codes={recoveryCodes} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            <span>I&apos;ve saved these somewhere safe.</span>
          </label>
          <Button className="w-full" disabled={!saved} onClick={() => navigate(next)}>
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up two-factor login</CardTitle>
        <CardDescription>
          Two-factor is required for everyone. Scan this QR code with an authenticator app such as
          Google Authenticator, Microsoft Authenticator or 1Password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormError message={error} />
        {enrolment ? (
          <>
            <div className="flex justify-center rounded-lg border bg-white p-4">
              {/* Supabase returns the QR code as an SVG data URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrolment.qrCode} alt="QR code for your authenticator app" className="size-48" />
            </div>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Can&apos;t scan it? Enter this key instead</summary>
              <code className="mt-2 block break-all rounded bg-muted p-2 font-mono">{enrolment.secret}</code>
            </details>
            <form onSubmit={onVerify} className="space-y-3">
              <Label htmlFor="code">Enter the 6-digit code from the app</Label>
              <CodeInput value={code} onChange={setCode} />
              <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
                {busy ? "Checking…" : "Turn on two-factor"}
              </Button>
            </form>
          </>
        ) : (
          !error && <p className="text-sm text-muted-foreground">Preparing your QR code…</p>
        )}
        <form action={signOut}>
          <Button type="submit" variant="link" size="sm" className="px-0">Sign out</Button>
        </form>
      </CardContent>
    </Card>
  );
}
