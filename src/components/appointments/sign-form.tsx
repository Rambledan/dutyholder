"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";
import { signAppointment } from "@/app/projects/appointment-actions";

export function AppointmentSignForm(props: {
  projectId: string;
  appointmentId: string;
  party: string;
  partyLabel: string;
  fullName: string;
}) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signAppointment(props.projectId, props.appointmentId, props.party, name);
    setBusy(false);
    if (result.error) return setError(result.error);
    router.refresh();
  }

  return (
    <form onSubmit={sign} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-medium">Sign as {props.partyLabel.toLowerCase()}</h3>
      <FormError message={error} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-4" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>I have read this document and agree to it.</span>
      </label>
      <div className="space-y-2">
        <Label htmlFor={`name-${props.party}`}>Type your full name to sign</Label>
        <Input id={`name-${props.party}`} autoComplete="name" className="h-10 text-base" placeholder={props.fullName}
          value={name} onChange={(e) => setName(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          We record your name, the time, your IP address and the document&apos;s fingerprint, and add them to the PDF.
        </p>
      </div>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || !agreed || name.trim().length < 2}>
        {busy ? "Signing…" : "Sign"}
      </Button>
    </form>
  );
}
