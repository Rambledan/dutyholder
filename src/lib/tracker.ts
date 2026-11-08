// The Relevant Requirements Tracker's labels and status logic (phase 10).
// Pure, so the pages, evidence pack and tests agree.

import type { Database } from "@/lib/supabase/database.types";

export type RequirementStatus = Database["public"]["Enums"]["requirement_status"];
export type RequirementRelevance = Database["public"]["Enums"]["requirement_relevance"];
export type ComplianceRoute = Database["public"]["Enums"]["compliance_route"];

export const REQUIREMENT_STATUSES: { value: RequirementStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "design_in_progress", label: "Design in progress" },
  { value: "ready_for_submission", label: "Ready for submission" },
  { value: "submitted_for_approval", label: "Submitted for approval" },
  { value: "granted_conditional", label: "Granted conditional approval" },
  { value: "granted", label: "Granted approval" },
];

export const ROUTES: { value: ComplianceRoute; label: string }[] = [
  { value: "approved_document", label: "Approved Document guidance" },
  { value: "iso_en_bs", label: "ISO/EN/BS guidance" },
  { value: "eurocode", label: "Eurocode guidance" },
  { value: "engineered", label: "Engineered solution" },
  { value: "performance_certified", label: "Performance certified solution" },
];

export const RELEVANCE_LABELS: Record<RequirementRelevance, string> = {
  to_confirm: "To confirm",
  relevant: "Relevant",
  not_relevant: "Not relevant",
};

export const statusLabel = (s: RequirementStatus) => REQUIREMENT_STATUSES.find((x) => x.value === s)?.label ?? s;
export const routeLabel = (r: ComplianceRoute | null) => ROUTES.find((x) => x.value === r)?.label ?? "—";

export type Tone = "grey" | "red" | "amber" | "green";

// PLAN.md: not started = red; granted = green; anything between = amber;
// not relevant = grey. "To confirm" is red: someone has to decide.
export function requirementTone(relevance: RequirementRelevance, status: RequirementStatus): Tone {
  if (relevance === "not_relevant") return "grey";
  if (relevance === "to_confirm" || status === "not_started") return "red";
  return status === "granted" ? "green" : "amber";
}

export function toneLabel(relevance: RequirementRelevance, status: RequirementStatus): string {
  if (relevance === "not_relevant") return "Not relevant";
  if (relevance === "to_confirm" && status === "not_started") return "To confirm";
  return statusLabel(status);
}

export const TONE_CLASSES: Record<Tone, string> = {
  grey: "bg-muted text-muted-foreground",
  red: "bg-destructive-soft text-destructive",
  amber: "bg-warning-soft text-warning",
  green: "bg-success-soft text-success",
};

// "Sch.1-Part B" -> "Part B"; "Part 6-Regs 22-28" -> "Regs 22-28".
export function sheetLabel(sheet: string): string {
  if (sheet.startsWith("Sch.1-")) return sheet.slice("Sch.1-".length);
  const dash = sheet.indexOf("-");
  return dash === -1 ? sheet : sheet.slice(dash + 1).replace(/^Reg(s?) /, "Reg$1 ");
}

export const isSchedule1 = (sheet: string) => sheet.startsWith("Sch.1-");

export const APPROVED_DOCUMENTS_URL = "https://www.gov.uk/government/collections/approved-documents";

export type StatusCounts = { toConfirm: number; notStarted: number; inProgress: number; granted: number; notRelevant: number };

export function countRows(rows: { relevance: RequirementRelevance; status: RequirementStatus }[]): StatusCounts {
  const c: StatusCounts = { toConfirm: 0, notStarted: 0, inProgress: 0, granted: 0, notRelevant: 0 };
  for (const r of rows) {
    if (r.relevance === "not_relevant") c.notRelevant++;
    else if (r.relevance === "to_confirm") c.toConfirm++;
    else if (r.status === "not_started") c.notStarted++;
    else if (r.status === "granted") c.granted++;
    else c.inProgress++;
  }
  return c;
}
