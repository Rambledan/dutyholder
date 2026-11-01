import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PackData } from "./types";

type Db = SupabaseClient<Database>;

// Reads everything for ONE project's evidence pack. Runs inside the export
// job with the secret key (it must read every member's files), so every
// query below is explicitly limited to this project.
export async function gatherPack(db: Db, projectId: string): Promise<PackData> {
  const one = async <T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>) => {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data as T;
  };

  const { data: project, error: projectError } = await db.from("projects").select("*").eq("id", projectId).single();
  if (projectError || !project) throw new Error(projectError?.message ?? "Project not found");
  const members = await one(db.from("project_members").select("*").eq("project_id", projectId));
  const userIds = members.map((m) => m.user_id).filter((x): x is string => Boolean(x));
  const profiles = userIds.length ? await one(db.from("profiles").select("id, full_name").in("id", userIds)) : [];
  const nameOfUser = (id: string | null) => profiles.find((p) => p.id === id)?.full_name || null;
  const nameOfMember = (m: (typeof members)[number]) => nameOfUser(m.user_id) || m.display_name || m.email;

  const items = await one(db.from("checklist_items")
    .select("id, member_id, template_code, status, answer, completed_at, competence_statement_id, duty_templates(title, legal_reference, item_type)")
    .eq("project_id", projectId).is("withdrawn_at", null));
  const signatures = await one(db.from("signatures").select("*").eq("project_id", projectId));
  const reviews = await one(db.from("reviews").select("*").eq("project_id", projectId).order("created_at"));

  const statementIds = [...new Set([
    ...items.map((i) => i.competence_statement_id).filter((x): x is string => Boolean(x)),
    ...reviews.map((r) => r.competence_statement_id),
  ])];
  const statements = statementIds.length ? await one(db.from("competence_statements").select("*").in("id", statementIds)) : [];
  const links = statementIds.length ? await one(db.from("competence_evidence").select("statement_id, document_id").in("statement_id", statementIds)) : [];
  const evidenceDocs = links.length ? await one(db.from("documents").select("*").in("id", links.map((l) => l.document_id))) : [];
  const itemDocs = await one(db.from("documents").select("*").eq("project_id", projectId).not("checklist_item_id", "is", null));

  const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))];
  const reviewers = reviewerIds.length ? await one(db.from("profiles").select("id, full_name").in("id", reviewerIds)) : [];

  const changeReports = await one(db.from("competence_change_reports").select("member_id, note, created_at").eq("project_id", projectId));
  const appointments = await one(db.from("appointments").select("*").eq("project_id", projectId).order("created_at"));
  const apptIds = appointments.map((a) => a.id);
  const signatories = apptIds.length ? await one(db.from("appointment_signatories").select("*").in("appointment_id", apptIds)) : [];
  const apptSignatures = apptIds.length ? await one(db.from("appointment_signatures").select("*").in("appointment_id", apptIds)) : [];

  // Audit: the project's own entries, plus entries about this project's
  // competence statements and documents (logged against the person).
  const docIds = [...evidenceDocs, ...itemDocs].map((d) => d.id);
  const projectAudit = await one(db.from("audit_log").select("*").eq("project_id", projectId).order("occurred_at"));
  const personalAudit = statementIds.length || docIds.length
    ? await one(db.from("audit_log").select("*").is("project_id", null)
        .in("entity_id", [...statementIds, ...docIds]).order("occurred_at"))
    : [];
  const audit = [...projectAudit, ...personalAudit].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  const actorIds = [...new Set(audit.map((a) => a.actor_id).filter((x): x is string => Boolean(x)))];
  const actors = actorIds.length ? await one(db.from("profiles").select("id, full_name").in("id", actorIds)) : [];

  // Original files, downloaded so they can be re-fingerprinted and zipped.
  const files = new Map<string, Uint8Array | null>();
  for (const d of [...evidenceDocs, ...itemDocs]) {
    if (d.withdrawn_at || files.has(d.storage_path)) continue;
    const { data: blob } = await db.storage.from("evidence").download(d.storage_path);
    files.set(d.storage_path, blob ? new Uint8Array(await blob.arrayBuffer()) : null);
  }

  return {
    generatedAt: new Date(),
    project,
    members: members.map((m) => ({
      id: m.id, name: nameOfMember(m), email: m.email, role: m.role, discipline: m.discipline,
      is_firm: m.is_firm, is_owner: m.is_owner, removed_at: m.removed_at,
    })),
    items: items.map((i) => ({
      id: i.id, member_id: i.member_id, code: i.template_code, title: i.duty_templates?.title ?? "",
      legal_reference: i.duty_templates?.legal_reference ?? "", item_type: i.duty_templates?.item_type ?? "form",
      status: i.status, answer: i.answer as { text?: string } | null, completed_at: i.completed_at,
      competence_statement_id: i.competence_statement_id,
    })),
    signatures: signatures.map((g) => ({ ...g, ip_address: (g.ip_address as string | null) ?? null })),
    statements,
    documents: [
      // One entry per statement a file belongs to: evidence carried over to
      // a new version appears under each version.
      ...links.flatMap((l) => {
        const d = evidenceDocs.find((x) => x.id === l.document_id);
        return d ? [{ ...d, statement_id: l.statement_id }] : [];
      }),
      ...itemDocs.map((d) => ({ ...d, statement_id: null })),
    ],
    reviews: reviews.map((r) => ({
      checklist_item_id: r.checklist_item_id, statement_version: r.statement_version, statement_sha256: r.statement_sha256,
      reviewer_name: reviewers.find((p) => p.id === r.reviewer_id)?.full_name ?? "Reviewer",
      decision: r.decision, note: r.note, created_at: r.created_at,
    })),
    changeReports,
    appointments: appointments.map((a) => ({
      ...a,
      signatures: signatories.filter((s) => s.appointment_id === a.id).map((s) => {
        const m = members.find((x) => x.id === s.member_id);
        const g = apptSignatures.find((x) => x.appointment_id === a.id && x.member_id === s.member_id && x.party === s.party);
        return {
          name: m ? nameOfMember(m) : "—", party: s.party,
          typed_name: g?.typed_name ?? null, signed_at: g?.signed_at ?? null, ip_address: (g?.ip_address as string | null) ?? null,
        };
      }),
    })),
    audit: audit.map((a) => ({
      occurred_at: a.occurred_at,
      actor: a.actor_id ? actors.find((p) => p.id === a.actor_id)?.full_name || a.actor_id : "System",
      action: a.action, entity_type: a.entity_type, entity_id: a.entity_id,
      ip_address: (a.ip_address as string | null) ?? null, details: a.details,
    })),
    files,
  };
}
