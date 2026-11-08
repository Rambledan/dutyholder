"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/auth/form-error";
import { keepFormValues } from "@/lib/keep-form-values";
import type { TrackerState } from "@/app/projects/tracker-actions";
import { REQUIREMENT_STATUSES, ROUTES, type RequirementRelevance } from "@/lib/tracker";

type Action = (prev: TrackerState, formData: FormData) => Promise<TrackerState>;
type Person = { id: string; label: string };

function Save({ pending, saved, label = "Save" }: { pending: boolean; saved: boolean; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : label}</Button>
      {saved && !pending && <span className="text-sm text-success">Saved</span>}
    </div>
  );
}

export function RelevanceForm(props: { action: Action; relevance: RequirementRelevance; reason: string }) {
  const [state, formAction, pending] = useActionState(props.action, { error: null, saved: false });
  const [choice, setChoice] = useState(props.relevance);
  return (
    <form onSubmit={keepFormValues(formAction)} className="space-y-3">
      <FormError message={state.error} />
      <div className="flex flex-wrap gap-4 text-sm">
        {([["relevant", "Relevant"], ["not_relevant", "Not relevant"], ["to_confirm", "To confirm"]] as const).map(([v, l]) => (
          <label key={v} className="flex items-center gap-1.5">
            <input type="radio" name="relevance" value={v} checked={choice === v} onChange={() => setChoice(v)} /> {l}
          </label>
        ))}
      </div>
      {choice === "not_relevant" && (
        <div className="space-y-2">
          <Label htmlFor="reason">Why it isn&apos;t relevant to this project</Label>
          <Textarea id="reason" name="reason" required rows={2} defaultValue={props.reason}
            placeholder="e.g. E4 not relevant: the building is offices, not a school." />
        </div>
      )}
      <Save pending={pending} saved={state.saved} />
    </form>
  );
}

function PersonSelect(props: { name: string; label: string; people: Person[]; value: string | null; none: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.name}>{props.label}</Label>
      <NativeSelect id={props.name} name={props.name} defaultValue={props.value ?? ""}>
        <option value="">{props.none}</option>
        {props.people.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </NativeSelect>
    </div>
  );
}

export function AssignForm(props: {
  action: Action; people: Person[];
  owner: string | null; stage2: string | null; stage3: string | null; stage4: string | null; stage5: string | null;
}) {
  const [state, formAction, pending] = useActionState(props.action, { error: null, saved: false });
  return (
    <form onSubmit={keepFormValues(formAction)} className="space-y-4">
      <FormError message={state.error} />
      <PersonSelect name="owner" label="Responsible designer" people={props.people} value={props.owner} none="Not assigned" />
      <div className="grid gap-4 sm:grid-cols-2">
        <PersonSelect name="stage2" label="Stage 2" people={props.people} value={props.stage2} none="Same as responsible" />
        <PersonSelect name="stage3" label="Stage 3" people={props.people} value={props.stage3} none="Same as responsible" />
        <PersonSelect name="stage4" label="Stage 4" people={props.people} value={props.stage4} none="Same as responsible" />
        <PersonSelect name="stage5" label="Stage 5 (construction)" people={props.people} value={props.stage5} none="Same as responsible" />
      </div>
      <Save pending={pending} saved={state.saved} />
    </form>
  );
}

export function AnswerForm(props: {
  action: Action; route: string | null; guidance: string; standardBasis: string;
  projectApplication: string; notes: string; status: string;
}) {
  const [state, formAction, pending] = useActionState(props.action, { error: null, saved: false });
  return (
    <form onSubmit={keepFormValues(formAction)} className="space-y-4">
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="route">Route to compliance</Label>
          <NativeSelect id="route" name="route" defaultValue={props.route ?? ""}>
            <option value="">Not chosen yet</option>
            {ROUTES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Submission status</Label>
          <NativeSelect id="status" name="status" defaultValue={props.status}>
            {REQUIREMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="guidance">Design guidance followed</Label>
        <Input id="guidance" name="guidance" defaultValue={props.guidance} placeholder="e.g. Approved Document B Volume 2, 2019 edition" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project_application">How this applies to this project</Label>
        <Textarea id="project_application" name="project_application" rows={5} defaultValue={props.projectApplication}
          placeholder="Specific to this building. Required before the row moves beyond design in progress." />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="standard_basis">Standard basis (optional)</Label>
        <Textarea id="standard_basis" name="standard_basis" rows={3} defaultValue={props.standardBasis}
          placeholder="Your usual wording that applies on most projects." />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes and evidence references</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={props.notes} placeholder="Reports, drawings or certificates this relies on." />
      </div>
      <Save pending={pending} saved={state.saved} />
    </form>
  );
}

export function ActionForm(props: { action: Action; people: Person[]; text: string; member: string | null; due: string | null }) {
  const [state, formAction, pending] = useActionState(props.action, { error: null, saved: false });
  return (
    <form onSubmit={keepFormValues(formAction)} className="space-y-4">
      <FormError message={state.error} />
      <div className="space-y-1.5">
        <Label htmlFor="action_text">Action required</Label>
        <Input id="action_text" name="action_text" defaultValue={props.text} placeholder="e.g. Provide SAP calculations at Stage 4" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PersonSelect name="action_member" label="Who" people={props.people} value={props.member} none="Nobody yet" />
        <div className="space-y-1.5">
          <Label htmlFor="action_due">Due</Label>
          <Input id="action_due" name="action_due" type="date" defaultValue={props.due ?? ""} className="w-auto" />
        </div>
      </div>
      <Save pending={pending} saved={state.saved} />
    </form>
  );
}
