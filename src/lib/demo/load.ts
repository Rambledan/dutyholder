import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { DemoSnapshot, DemoState } from "./simulate";

// Everything planDemoDay() needs, read as the demo's owner (through RLS).
export async function loadDemoSnapshot(supabase: SupabaseClient<Database>, projectId: string): Promise<DemoSnapshot | null> {
  const [{ data: project }, { data: members }, { data: items }, { data: reminders }] = await Promise.all([
    supabase.from("projects")
      .select("id, name, clock_offset_days, construction_start_date, is_demo, demo_started_at, demo_state")
      .eq("id", projectId).maybeSingle(),
    supabase.from("project_members")
      .select("id, project_id, user_id, email, display_name, role, is_owner, chasing_paused, invited_at, created_at, demo_persona")
      .eq("project_id", projectId).is("removed_at", null),
    supabase.from("checklist_items")
      .select("id, project_id, member_id, template_code, status, due_date, duty_templates(title, item_type)")
      .eq("project_id", projectId).is("withdrawn_at", null),
    supabase.from("reminders").select("member_id, project_id, step_key, kind, recipient_email, project_day")
      .eq("project_id", projectId),
  ]);
  if (!project?.is_demo || !members) return null;

  const userIds = members.map((m) => m.user_id).filter((x): x is string => Boolean(x));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };

  return {
    project: { ...project, demo_state: (project.demo_state ?? {}) as DemoState },
    members: members.map((m) => ({
      ...m,
      name: profiles?.find((p) => p.id === m.user_id)?.full_name || m.display_name || m.email,
      started_at: m.invited_at ?? m.created_at,
    })),
    items: (items ?? []).map((i) => ({
      id: i.id, project_id: i.project_id, member_id: i.member_id, code: i.template_code, status: i.status,
      title: i.duty_templates?.title ?? "", item_type: i.duty_templates?.item_type ?? "form", due_date: i.due_date,
    })),
    reminders: reminders ?? [],
  };
}
