"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/auth/form-error";
import { reviewCompetence } from "@/app/projects/review-actions";

export function ReviewForm(props: { projectId: string; itemId: string; personName: string; backHref: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"satisfied" | "needs_info" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!decision) return;
    setBusy(true);
    setError(null);
    const result = await reviewCompetence(props.projectId, props.itemId, decision, note);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(props.backHref);
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Your decision</legend>
        <label className="flex items-start gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-green-600">
          <input type="radio" name="decision" className="mt-1" checked={decision === "satisfied"}
            onChange={() => setDecision("satisfied")} />
          <span>
            <span className="font-medium">Satisfied</span>
            <span className="block text-muted-foreground">
              I have taken reasonable steps and am satisfied {props.personName} has the competence for this work.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-amber-600">
          <input type="radio" name="decision" className="mt-1" checked={decision === "needs_info"}
            onChange={() => setDecision("needs_info")} />
          <span>
            <span className="font-medium">Need more information</span>
            <span className="block text-muted-foreground">They&apos;ll be asked to update their statement.</span>
          </span>
        </label>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="note">{decision === "needs_info" ? "What do you need? (required)" : "Note (optional)"}</Label>
        <Textarea id="note" rows={4} className="text-base" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={decision === "needs_info" ? "e.g. Please add your professional indemnity insurance certificate." : "e.g. Chartered engineer; comparable projects checked."} />
      </div>
      <Button size="lg" className="w-full sm:w-auto" onClick={submit}
        disabled={busy || !decision || (decision === "needs_info" && !note.trim())}>
        {busy ? "Saving…" : "Record decision"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Your decision, the time and a fingerprint of the exact version you reviewed are recorded permanently.
      </p>
    </div>
  );
}
