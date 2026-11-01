"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/auth/form-error";
import { prepareAppointment } from "@/app/projects/appointment-actions";
import { buildLetter, type AppointmentKind, type Person } from "@/lib/letters";

export function PrepareForm(props: {
  projectId: string;
  kind: AppointmentKind;
  projectName: string;
  projectAddress: string;
  date: string;
  clients: Person[];
  domesticClient: boolean;
  appointers: Person[];
  candidates: { memberId: string; person: Person }[];
}) {
  const router = useRouter();
  const [appointeeId, setAppointeeId] = useState(props.candidates.length === 1 ? props.candidates[0].memberId : "");
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appointee = props.candidates.find((c) => c.memberId === appointeeId)?.person;

  const preview = appointee
    ? buildLetter({
        kind: props.kind,
        projectName: props.projectName,
        projectAddress: props.projectAddress,
        date: props.date,
        clients: props.clients,
        domesticClient: props.domesticClient,
        appointers: props.appointers,
        appointee,
        scope: props.kind === "cdm_certification" ? "" : scope,
      })
    : null;

  async function issue() {
    setBusy(true);
    setError(null);
    const result = await prepareAppointment(props.projectId, props.kind, appointeeId, scope);
    if (result.error || !result.id) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/projects/${props.projectId}/appointments/${result.id}`);
  }

  return (
    <div className="space-y-5">
      <FormError message={error} />
      <div className="space-y-2">
        <Label htmlFor="appointee">{props.kind === "lead_designer_agreement" ? "Lead designer" : "Who is being appointed"}</Label>
        <NativeSelect id="appointee" value={appointeeId} onChange={(e) => setAppointeeId(e.target.value)} className="h-10 text-base">
          <option value="" disabled>Choose…</option>
          {props.candidates.map((c) => (
            <option key={c.memberId} value={c.memberId}>
              {c.person.name}{c.person.company ? ` (${c.person.company})` : ""}
            </option>
          ))}
        </NativeSelect>
      </div>
      {props.kind !== "cdm_certification" && (
        <div className="space-y-2">
          <Label htmlFor="scope">Scope and notes (optional)</Label>
          <Textarea id="scope" rows={3} className="text-base" value={scope} onChange={(e) => setScope(e.target.value)}
            placeholder="e.g. Covers the design and construction stages of the rear extension only." />
        </div>
      )}
      {preview && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Preview</h3>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 font-sans text-sm">{preview.text}</pre>
        </div>
      )}
      <Button size="lg" className="w-full sm:w-auto" onClick={issue} disabled={busy || !appointeeId}>
        {busy ? "Issuing…" : "Issue for signature"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Once issued the wording is fixed and fingerprinted. To change it, void the letter and issue a new one.
      </p>
    </div>
  );
}
