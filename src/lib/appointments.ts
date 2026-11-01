import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AppointmentKind, Person } from "@/lib/letters";

type Db = SupabaseClient<Database>;

export const ITEM_CODE: Record<AppointmentKind, string> = {
  pd_appointment: "CL-11D-APPOINT-PD",
  pc_appointment: "CL-11D-APPOINT-PC",
  lead_designer_agreement: "DES-11D-LEAD",
  cdm_certification: "CL-11D-CDM",
};

// Which roles can be the appointee for each kind.
export const APPOINTEE_ROLES: Record<AppointmentKind, string[]> = {
  pd_appointment: ["principal_designer"],
  pc_appointment: ["principal_contractor"],
  lead_designer_agreement: ["designer", "principal_designer"],
  cdm_certification: ["principal_designer"],
};

type MemberRow = { id: string; user_id: string | null; email: string; display_name: string; role: string | null; is_firm: boolean };

// Names as they should appear on a letter: the person's account name, with
// the name the owner entered shown as the company for firm appointments.
export async function people(supabase: Db, members: MemberRow[]): Promise<Map<string, Person>> {
  const ids = members.map((m) => m.user_id).filter((x): x is string => Boolean(x));
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, company").in("id", ids)
    : { data: [] };
  const out = new Map<string, Person>();
  for (const m of members) {
    const p = profiles?.find((x) => x.id === m.user_id);
    const name = p?.full_name || m.display_name || m.email;
    const company = p?.company || (m.is_firm && m.display_name && m.display_name !== name ? m.display_name : null);
    out.set(m.id, { name, company, isFirm: m.is_firm });
  }
  return out;
}

// Everything the letter template needs except the chosen appointee.
export async function letterContext(supabase: Db, projectId: string, kind: AppointmentKind) {
  const [{ data: project }, { data: members }, { data: holders }] = await Promise.all([
    supabase.from("projects").select("name, address, is_domestic_client").eq("id", projectId).maybeSingle(),
    supabase.from("project_members").select("id, user_id, email, display_name, role, is_firm")
      .eq("project_id", projectId).is("removed_at", null),
    supabase.from("checklist_items").select("member_id")
      .eq("project_id", projectId).eq("template_code", ITEM_CODE[kind]).is("withdrawn_at", null),
  ]);
  const all = members ?? [];
  const names = await people(supabase, all);
  const holderIds = new Set((holders ?? []).map((h) => h.member_id));
  return {
    project: project ?? { name: "", address: "", is_domestic_client: false },
    clients: all.filter((m) => m.role === "client").map((m) => names.get(m.id)!),
    appointers: all.filter((m) => holderIds.has(m.id)).map((m) => names.get(m.id)!),
    candidates: all
      .filter((m) => m.role && APPOINTEE_ROLES[kind].includes(m.role))
      .map((m) => ({ memberId: m.id, person: names.get(m.id)! })),
  };
}
