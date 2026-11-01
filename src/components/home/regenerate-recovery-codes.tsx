"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/auth/form-error";
import { RecoveryCodes } from "@/components/auth/recovery-codes";
import { createClient } from "@/lib/supabase/client";

export function RegenerateRecoveryCodes() {
  const router = useRouter();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    if (!window.confirm("This replaces all your existing recovery codes. Continue?")) return;
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("generate_recovery_codes");
    setBusy(false);
    if (error || !Array.isArray(data)) return setError("Couldn't create new codes. Please try again.");
    setCodes(data as string[]);
    router.refresh();
  }

  if (codes) {
    return (
      <div className="space-y-2">
        <p className="font-medium">Your new recovery codes. Save them now; they won&apos;t be shown again.</p>
        <RecoveryCodes codes={codes} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <FormError message={error} />
      <Button type="button" variant="outline" size="sm" onClick={regenerate} disabled={busy}>
        {busy ? "Creating…" : "Make new recovery codes"}
      </Button>
    </div>
  );
}
