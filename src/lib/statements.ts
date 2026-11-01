import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Statement } from "@/components/tasks/competence-form";
import type { FileRow } from "@/components/tasks/file-list";

// One competence statement version with its active evidence files.
export async function loadStatement(supabase: SupabaseClient<Database>, id: string): Promise<Statement | null> {
  const [{ data: s }, { data: links }] = await Promise.all([
    supabase.from("competence_statements").select("*").eq("id", id).maybeSingle(),
    supabase.from("competence_evidence")
      .select("documents(id, file_name, size_bytes, sha256, withdrawn_at, created_at)")
      .eq("statement_id", id),
  ]);
  if (!s) return null;
  const files: FileRow[] = (links ?? [])
    .map((l) => l.documents)
    .filter((d): d is NonNullable<typeof d> => Boolean(d) && !d!.withdrawn_at)
    .map((d) => ({ id: d.id, fileName: d.file_name, sizeBytes: d.size_bytes, sha256: d.sha256, createdAt: d.created_at }));
  return {
    skills: s.skills,
    knowledge: s.knowledge,
    experience: s.experience,
    behaviour_compliance: s.behaviour_compliance,
    behaviour_cooperation: s.behaviour_cooperation,
    behaviour_limits: s.behaviour_limits,
    organisational_capability: s.organisational_capability,
    has_serious_sanctions: s.has_serious_sanctions,
    sanctions_details: s.sanctions_details,
    version: s.version,
    submittedAt: s.submitted_at,
    files,
  };
}
