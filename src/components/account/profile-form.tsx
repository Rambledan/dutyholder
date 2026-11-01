"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/auth/form-error";
import { saveProfile } from "@/app/account/actions";

export type ProfileValues = { full_name: string; company: string; job_title: string; phone: string; memberships: string };

export function ProfileForm({ initial, email }: { initial: ProfileValues; email: string }) {
  const [state, action, pending] = useActionState(saveProfile, { error: null });
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      {state.message && <p className="text-sm text-green-700 dark:text-green-400">{state.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" autoComplete="name" required defaultValue={initial.full_name} />
          <p className="text-xs text-muted-foreground">You sign with this name, so keep it exact.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Sign-in email</Label>
          <Input id="email" value={email} disabled readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" autoComplete="organization" defaultValue={initial.company} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="job_title">Job title</Label>
          <Input id="job_title" name="job_title" autoComplete="organization-title" defaultValue={initial.job_title} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={initial.phone} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="memberships">Professional memberships and registrations</Label>
        <Textarea id="memberships" name="memberships" rows={3} defaultValue={initial.memberships}
          placeholder="e.g. CEng MIStructE (membership no. 012345); ARB registered architect" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save details"}</Button>
    </form>
  );
}
