"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/auth/form-error";
import { reportChange } from "@/app/projects/review-actions";

export function ReportChangeForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm("Send this report? Your competence statement will go back for review.")) return;
    setBusy(true);
    setError(null);
    const result = await reportChange(projectId, note);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/projects/${projectId}/tasks`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormError message={error} />
      <div className="space-y-2">
        <Label htmlFor="change">What has changed?</Label>
        <Textarea id="change" rows={5} className="text-base" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. My professional indemnity insurance lapsed on 30 October; the engineer leading this work has left the firm." />
      </div>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || !note.trim()}>
        {busy ? "Sending…" : "Send report"}
      </Button>
    </form>
  );
}
