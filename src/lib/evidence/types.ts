// Everything the evidence pack is built from, gathered for one project.

export type PackMember = {
  id: string; name: string; email: string; role: string | null; discipline: string | null;
  is_firm: boolean; is_owner: boolean; removed_at: string | null;
  appointment_ended_on?: string | null; phone?: string | null; company?: string | null;
};
export type PackItem = {
  id: string; member_id: string; code: string; title: string; legal_reference: string; item_type: string;
  status: string; answer: { text?: string } | null; completed_at: string | null; competence_statement_id: string | null;
  due_date?: string | null;
};
export type PackSignature = {
  checklist_item_id: string; member_id: string; typed_name: string; statement: string; statement_sha256: string;
  template_code: string; template_version: number; signed_at: string; ip_address: string | null;
};
export type PackStatement = {
  id: string; version: number; status: string; submitted_at: string | null; content_sha256: string | null;
  skills: string; knowledge: string; experience: string; behaviour_compliance: string; behaviour_cooperation: string;
  behaviour_limits: string; organisational_capability: string; has_serious_sanctions: boolean | null; sanctions_details: string;
};
export type PackDocument = {
  id: string; file_name: string; mime_type: string; size_bytes: number; sha256: string; storage_path: string;
  created_at: string; withdrawn_at: string | null; withdrawn_reason: string | null;
  statement_id: string | null; checklist_item_id: string | null;
};
export type PackReview = {
  checklist_item_id: string; statement_version: number; statement_sha256: string; reviewer_name: string;
  decision: string; note: string; created_at: string;
};
export type PackChangeReport = { member_id: string; note: string; created_at: string };
export type PackAppointment = {
  id: string; kind: string; status: string; letter_title: string; letter_text: string; letter_sha256: string;
  template_version: string; created_at: string; completed_at: string | null; void_reason: string | null;
  signatures: { name: string; party: string; typed_name: string | null; signed_at: string | null; ip_address: string | null }[];
};
export type PackAudit = {
  occurred_at: string; actor: string; action: string; entity_type: string; entity_id: string | null;
  ip_address: string | null; details: unknown;
};

export type PackData = {
  generatedAt: Date;
  project: {
    id: string; name: string; address: string; description: string; is_domestic_client: boolean;
    domestic_duties_to_pd: boolean; expected_contractors: number; cdm_pd_certified: boolean;
    construction_start_date: string | null; retention_years: number; is_demo: boolean; created_at: string;
    bc_application_date?: string | null; construction_started_on?: string | null;
    work_completed_on?: string | null; occupation_date?: string | null;
  };
  members: PackMember[];
  items: PackItem[];
  signatures: PackSignature[];
  statements: PackStatement[];
  documents: PackDocument[];
  reviews: PackReview[];
  changeReports: PackChangeReport[];
  appointments: PackAppointment[];
  audit: PackAudit[];
  // File contents by storage path (null if it couldn't be downloaded).
  files: Map<string, Uint8Array | null>;
};
