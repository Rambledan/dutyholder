import { connection } from "next/server";
import { requireAal2 } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_ENABLED } from "@/lib/features";
import type { DutyholderRole } from "@/lib/labels";
import type { ProjectScope } from "@/lib/nav";
import { SidebarNav } from "./sidebar-nav";

// Loads the projects this person can see and what they hold on each, then
// hands them to the client-side menu. Every read goes through RLS.
export async function AppSidebar({ optional = false }: { optional?: boolean }) {
  if (optional && !(await isFullySignedIn())) return null;
  const { supabase, userId, email } = await requireAal2();
  const [{ data: profile }, { data: projects }, { data: myRoles }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("projects").select("id, name, is_demo").order("created_at", { ascending: false }),
    supabase.from("project_members").select("id, project_id, role, is_owner").eq("user_id", userId).is("removed_at", null),
  ]);
  const { data: myItems } = myRoles?.length
    ? await supabase.from("checklist_items").select("project_id, status")
        .in("member_id", myRoles.map((r) => r.id)).is("withdrawn_at", null)
    : { data: [] };

  const scopes: ProjectScope[] = (projects ?? [])
    .filter((p) => DEMO_ENABLED || !p.is_demo)
    .map((p) => {
      const mine = (myRoles ?? []).filter((r) => r.project_id === p.id);
      return {
        id: p.id,
        name: p.name,
        roles: mine.map((r) => r.role).filter((r): r is DutyholderRole => r !== null),
        isOwner: mine.some((r) => r.is_owner),
        openTasks: (myItems ?? []).filter((i) => i.project_id === p.id && i.status !== "complete" && i.status !== "submitted").length,
      };
    });

  return <SidebarNav projects={scopes} person={{ name: profile?.full_name ?? "", email }} />;
}

async function isFullySignedIn() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.aal === "aal2";
}
