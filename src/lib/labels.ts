import type { Database } from "@/lib/supabase/database.types";

export type DutyholderRole = Database["public"]["Enums"]["dutyholder_role"];
export type ItemStatus = Database["public"]["Enums"]["item_status"];
export type ItemType = Database["public"]["Enums"]["item_type"];

// Statutory role names, in the order the law lists them.
export const ROLES: { value: DutyholderRole; label: string }[] = [
  { value: "client", label: "Client" },
  { value: "principal_designer", label: "Principal designer" },
  { value: "designer", label: "Designer" },
  { value: "principal_contractor", label: "Principal contractor" },
  { value: "contractor", label: "Contractor" },
];

export function roleLabel(role: DutyholderRole | null): string {
  return ROLES.find((r) => r.value === role)?.label ?? "Owner (no statutory role)";
}

export const DISCIPLINES = [
  { value: "architecture", label: "Architecture" },
  { value: "structural", label: "Structural" },
  { value: "fire", label: "Fire" },
  { value: "mep", label: "MEP" },
  { value: "civil", label: "Civil" },
  { value: "other", label: "Other" },
];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  acknowledge: "Acknowledge",
  upload: "Upload",
  form: "Form",
  sign: "Sign",
  review: "Review",
};

export const STATUS_LABELS: Record<ItemStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  needs_info: "Needs info",
  complete: "Complete",
};

// Red / amber / green, as described in PLAN.md.
export function rag(status: ItemStatus): "red" | "amber" | "green" {
  if (status === "complete") return "green";
  if (status === "in_progress" || status === "submitted") return "amber";
  return "red";
}
