"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/auth/form-error";
import { completeFormItem, saveItemAnswer, type DoneResult } from "@/app/projects/task-actions";
import { SaveStatus, useAutosave } from "./use-autosave";

export function SimpleForm(props: { projectId: string; itemId: string; initial: string; prompt: string; nextHref: string }) {
  const router = useRouter();
  const [text, setText] = useState(props.initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useCallback((value: string) => saveItemAnswer(props.itemId, value), [props.itemId]);
  const autosave = useAutosave(text, save);

  async function complete() {
    setBusy(true);
    setError(null);
    const saved = await saveItemAnswer(props.itemId, text);
    const result: DoneResult = saved.error ? saved : await completeFormItem(props.projectId, props.itemId);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(result.next ?? props.nextHref);
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <div className="space-y-2">
        <Label htmlFor="answer">{props.prompt}</Label>
        <Textarea id="answer" rows={8} value={text} onChange={(e) => setText(e.target.value)} className="text-base" />
        <SaveStatus {...autosave} />
      </div>
      <Button type="button" size="lg" className="w-full sm:w-auto" onClick={complete} disabled={busy || !text.trim()}>
        {busy ? "Saving…" : "Mark complete and continue"}
      </Button>
    </div>
  );
}
