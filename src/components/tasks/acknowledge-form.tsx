"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";
import { signAcknowledgement } from "@/app/projects/task-actions";

export function AcknowledgeForm(props: { projectId: string; itemId: string; fullName: string; nextHref: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signAcknowledgement(props.projectId, props.itemId, name);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(result.next ?? props.nextHref);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-4" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>I confirm I have read and understood this duty and will comply with it.</span>
      </label>
      <div className="space-y-2">
        <Label htmlFor="typed-name">Type your full name to sign</Label>
        <Input id="typed-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder={props.fullName} className="h-10 text-base" />
        <p className="text-xs text-muted-foreground">
          We record your name, the time, your IP address and a fingerprint of the exact wording above.
        </p>
      </div>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || !agreed || name.trim().length < 2}>
        {busy ? "Signing…" : "Sign and continue"}
      </Button>
    </form>
  );
}
