// Concerns and comments between dutyholders (phase 9). Pure, so the page,
// the server actions and the tests agree on who raises what to whom. The
// database (raise_concern / respond_to_concern) enforces the same rules.

import type { DutyholderRole } from "@/lib/labels";

export type ConcernKind = "design_concern" | "building_concern" | "pc_comment" | "pd_comment";

export const CONCERN_KINDS: Record<ConcernKind, {
  label: string; reg: string; to: "principal_designer" | "principal_contractor"; toLabel: string; hint: string;
}> = {
  design_concern: {
    label: "Design concern", reg: "Reg 11K(4)", to: "principal_designer", toLabel: "principal designer",
    hint: "A concern about compliance in design work related to yours.",
  },
  building_concern: {
    label: "Building work concern", reg: "Reg 11L(4)", to: "principal_contractor", toLabel: "principal contractor",
    hint: "A concern about compliance in building work related to yours.",
  },
  pc_comment: {
    label: "Comment to the principal designer", reg: "Reg 11M(4)", to: "principal_designer", toLabel: "principal designer",
    hint: "The principal designer must have regard to your comments on compliance.",
  },
  pd_comment: {
    label: "Comment to the principal contractor", reg: "Reg 11N(4)", to: "principal_contractor", toLabel: "principal contractor",
    hint: "The principal contractor must have regard to your comments on compliance.",
  },
};

export const isConcernKind = (k: string): k is ConcernKind => k in CONCERN_KINDS;

// A sole contractor is the principal contractor (11D(6)).
export function effectiveRoles(roles: (DutyholderRole | null)[], expectedContractors: number): DutyholderRole[] {
  const out = new Set<DutyholderRole>();
  for (const r of roles) {
    if (!r) continue;
    out.add(r);
    if (r === "contractor" && expectedContractors === 1) out.add("principal_contractor");
  }
  return [...out];
}

// Which kinds this person can raise on the project.
export function kindsICanRaise(roles: DutyholderRole[], expectedContractors: number): ConcernKind[] {
  const kinds: ConcernKind[] = [];
  if (roles.includes("designer")) kinds.push("design_concern");
  if (roles.includes("contractor") && expectedContractors > 1) kinds.push("building_concern");
  if (roles.includes("principal_contractor")) kinds.push("pc_comment");
  if (roles.includes("principal_designer")) kinds.push("pd_comment");
  return kinds;
}

export function canRespond(kind: ConcernKind, roles: DutyholderRole[], isOwner: boolean): boolean {
  return isOwner || roles.includes(CONCERN_KINDS[kind].to);
}
