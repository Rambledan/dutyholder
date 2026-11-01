"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FormError } from "@/components/auth/form-error";
import { DISCIPLINES, ROLES } from "@/lib/labels";
import type { FormState } from "@/app/projects/actions";
import { Term } from "@/components/help/term";
import { HelpLink } from "@/components/help/help-link";

export function AddMemberForm(props: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(props.action, { error: null });
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  // Clear the form after a successful add.
  useEffect(() => {
    if (submitted.current && !pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={(fd) => { submitted.current = true; formAction(fd); }} className="space-y-4">
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Name</Label>
          <Input id="display_name" name="display_name" placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role <HelpLink topic="roles" /></Label>
          <NativeSelect id="role" name="role" required defaultValue="">
            <option value="" disabled>Choose a role…</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="discipline">Discipline</Label>
          <NativeSelect id="discipline" name="discipline" defaultValue="">
            <option value="">Not applicable</option>
            {DISCIPLINES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_firm" />
        <Term id="firm">This appointment is held by a firm, not an individual</Term>
      </label>
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add to team"}</Button>
    </form>
  );
}
