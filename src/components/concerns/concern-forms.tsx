"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/auth/form-error";
import { keepFormValues } from "@/lib/keep-form-values";
import { CONCERN_KINDS, type ConcernKind } from "@/lib/concerns";
import type { ConcernState } from "@/app/projects/concern-actions";

type Action = (prev: ConcernState, formData: FormData) => Promise<ConcernState>;

// Clears the form once the action succeeds.
function useResetOnDone(state: ConcernState, pending: boolean) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.done && !pending) ref.current?.reset();
  }, [state, pending]);
  return ref;
}

export function RaiseConcernForm(props: { kinds: ConcernKind[]; action: Action }) {
  const [state, formAction, pending] = useActionState(props.action, { error: null, done: false });
  const ref = useResetOnDone(state, pending);
  const [kind, setKind] = useState<ConcernKind>(props.kinds[0]);
  const info = CONCERN_KINDS[kind];

  return (
    <form ref={ref} onSubmit={keepFormValues(formAction)} className="space-y-4">
      <FormError message={state.error} />
      {props.kinds.length > 1 ? (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">What is it?</legend>
          {props.kinds.map((k) => (
            <label key={k} className="flex items-start gap-2 text-sm">
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="mt-1" />
              <span>{CONCERN_KINDS[k].label} <span className="text-muted-foreground">({CONCERN_KINDS[k].reg})</span></span>
            </label>
          ))}
        </fieldset>
      ) : (
        <input type="hidden" name="kind" value={kind} />
      )}
      <p className="text-sm text-muted-foreground">
        {info.hint} It goes to the {info.toLabel}, who must record a response. Once sent it can&apos;t be edited or
        deleted.
      </p>
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" required maxLength={200} placeholder="e.g. Fire stopping at the party wall" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Describe the concern</Label>
        <Textarea id="body" name="body" required rows={5}
          placeholder="What you've seen, which drawings or work it affects, and why it may not comply." />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Sending…" : `Send to the ${info.toLabel}`}</Button>
        {state.done && !pending && <span className="text-sm text-success">Sent and recorded</span>}
      </div>
    </form>
  );
}

export function RespondForm(props: { id: string; action: Action }) {
  const [state, formAction, pending] = useActionState(props.action, { error: null, done: false });
  const ref = useResetOnDone(state, pending);
  return (
    <form ref={ref} onSubmit={keepFormValues(formAction)} className="space-y-2">
      <FormError message={state.error} />
      <Label htmlFor={`respond-${props.id}`}>Your response</Label>
      <Textarea id={`respond-${props.id}`} name="body" required rows={3}
        placeholder="What you've decided or done about it, and why." />
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Recording…" : "Record response"}</Button>
    </form>
  );
}
