"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormError } from "@/components/auth/form-error";
import { YesNo } from "@/components/projects/yes-no";
import { ROLES } from "@/lib/labels";
import type { FormState } from "@/app/projects/actions";

export type SetupValues = {
  name: string;
  address: string;
  description: string;
  isDomesticClient: boolean;
  domesticDutiesToPd: boolean;
  expectedContractors: number;
  cdmPdCertified: boolean;
};

const EMPTY: SetupValues = {
  name: "",
  address: "",
  description: "",
  isDomesticClient: false,
  domesticDutiesToPd: false,
  expectedContractors: 2,
  cdmPdCertified: false,
};

// The project set-up questions, used both to create and to edit a project.
export function ProjectSetupForm(props: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: SetupValues;
  askOwnerRole?: boolean;
  submitLabel: string;
}) {
  const initial = props.initial ?? EMPTY;
  const [state, formAction, pending] = useActionState(props.action, { error: null });
  const [domestic, setDomestic] = useState(initial.isDomesticClient);
  const [domesticToPd, setDomesticToPd] = useState(initial.domesticDutiesToPd);
  const [higherRisk, setHigherRisk] = useState(false);
  const [oneContractor, setOneContractor] = useState(initial.expectedContractors === 1);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />

      <div className="space-y-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" name="name" required defaultValue={initial.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Site address</Label>
        <Input id="address" name="address" defaultValue={initial.address} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} defaultValue={initial.description}
          placeholder="Building type, use, storeys, height, new build or alteration, number of homes…" />
        <p className="text-xs text-muted-foreground">Phase 8 will use this to suggest which regulations apply.</p>
      </div>

      <p className="rounded-lg border bg-muted/40 p-3 text-sm">
        <span className="font-medium">Jurisdiction:</span> England (Part 2A of the Building Regulations 2010).
      </p>

      <YesNo name="is_higher_risk" legend="Is any of this higher-risk building work?"
        hint="At least 18m or 7 storeys with 2 or more homes, or a hospital or care home."
        value={higherRisk} onChange={setHigherRisk} />
      {higherRisk && (
        <Alert variant="destructive">
          <AlertDescription>
            Higher-risk building work needs extra records and a Gateway 2 application to the Building Safety
            Regulator. This version doesn&apos;t support it yet.
          </AlertDescription>
        </Alert>
      )}

      <YesNo name="is_domestic_client" legend="Is the client a domestic client?"
        hint="A homeowner having work done on their own home, not in the course of a business."
        value={domestic} onChange={setDomestic} />
      {domestic && (
        <div className="border-l-2 pl-4">
          <YesNo name="domestic_duties_to_pd"
            legend="Has the client agreed in writing that the principal designer carries out their duties?"
            hint="If not, the client's duties pass to the contractor side (reg 11C)."
            value={domesticToPd} onChange={setDomesticToPd} />
        </div>
      )}

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">How many contractors will work on the project?</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="contractors" value="one" checked={oneContractor}
              onChange={() => setOneContractor(true)} />
            Only one
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="contractors" value="many" checked={!oneContractor}
              onChange={() => setOneContractor(false)} />
            More than one (or likely to be)
          </label>
        </div>
      </fieldset>

      {!oneContractor && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="cdm_pd_certified" className="mt-1" defaultChecked={initial.cdmPdCertified} />
          <span>
            The client will certify that the CDM 2015 principal designer is also the Building Regulations principal
            designer (reg 11D(2)).
          </span>
        </label>
      )}

      {props.askOwnerRole && (
        <div className="space-y-2">
          <Label htmlFor="owner_role">Your role on this project</Label>
          <NativeSelect id="owner_role" name="owner_role" defaultValue="principal_designer">
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </NativeSelect>
        </div>
      )}

      <Button type="submit" disabled={pending || higherRisk}>
        {pending ? "Saving…" : props.submitLabel}
      </Button>
    </form>
  );
}
