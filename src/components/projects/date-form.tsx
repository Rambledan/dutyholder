"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";
import type { DateState } from "@/app/projects/deadline-actions";

// One trigger date: a date box, Save, and Clear when a date is recorded.
export function DateForm(props: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  initial: string | null;
  max?: string;
  submitLabel?: string;
  // Shown instead of the form when the date can't be recorded yet.
  blockedReason?: string | null;
  action: (prev: DateState, formData: FormData) => Promise<DateState>;
}) {
  const [state, formAction, pending] = useActionState(props.action, { error: null, saved: false });

  return (
    <form action={formAction} className="space-y-2">
      <Label htmlFor={props.id} className="font-medium">{props.label}</Label>
      {props.hint && <p className="text-sm text-muted-foreground">{props.hint}</p>}
      <FormError message={state.error} />
      {props.blockedReason && !props.initial ? (
        <p className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm">{props.blockedReason}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Input id={props.id} name="date" type="date" defaultValue={props.initial ?? ""} max={props.max}
            className="h-10 w-auto text-base" required />
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : props.submitLabel ?? "Save"}</Button>
          {props.initial && (
            <Button type="submit" name="clear" value="yes" variant="ghost" disabled={pending} formNoValidate>
              Clear
            </Button>
          )}
          {state.saved && !pending && <span className="text-sm text-success">Saved</span>}
        </div>
      )}
    </form>
  );
}
