import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ItemStatus, ItemType } from "@/lib/labels";
import { DEADLINES, isWaiting } from "@/lib/deadlines";

export type Task = {
  id: string;
  code: string;
  status: ItemStatus;
  title: string;
  explanation: string;
  legalReference: string;
  legislationUrl: string | null;
  itemType: ItemType;
  sortOrder: number;
  memberId: string;
  // False while a legal clock hasn't started (e.g. the handover before the
  // appointment ends). Everything else can be opened.
  available: boolean;
  // Set by the database from the trigger event (phase 8).
  dueDate: string | null;
  // What an unavailable task is waiting for.
  waitingFor: string | null;
};

// The signed-in user's own active tasks on one project, in duty order.
export async function loadMyTasks(supabase: SupabaseClient<Database>, projectId: string, userId: string) {
  const { data: myMembers } = await supabase
    .from("project_members")
    .select("id, role, is_firm")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .is("removed_at", null);
  const memberIds = (myMembers ?? []).map((m) => m.id);
  if (!memberIds.length) return { tasks: [] as Task[], members: myMembers ?? [] };

  const { data } = await supabase
    .from("checklist_items")
    .select("id, template_code, status, member_id, due_date, duty_templates(title, explanation, legal_reference, legislation_url, item_type, sort_order)")
    .in("member_id", memberIds)
    .is("withdrawn_at", null);

  const tasks: Task[] = (data ?? [])
    .filter((i) => i.duty_templates)
    .map((i) => ({
      id: i.id,
      code: i.template_code,
      status: i.status,
      title: i.duty_templates!.title,
      explanation: i.duty_templates!.explanation,
      legalReference: i.duty_templates!.legal_reference,
      legislationUrl: i.duty_templates!.legislation_url,
      itemType: i.duty_templates!.item_type,
      sortOrder: i.duty_templates!.sort_order,
      memberId: i.member_id,
      available: !isWaiting(i.template_code, i.due_date),
      dueDate: i.due_date,
      waitingFor: isWaiting(i.template_code, i.due_date) ? DEADLINES[i.template_code].waitingFor : null,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { tasks, members: myMembers ?? [] };
}

export function progress(tasks: Task[]) {
  const done = tasks.filter((t) => t.status === "complete" || t.status === "submitted").length;
  return { done, total: tasks.length };
}

// The next task worth opening: not done and available now.
export function nextTask(tasks: Task[], afterId?: string): Task | undefined {
  const open = (t: Task) => t.available && !["complete", "submitted"].includes(t.status);
  const start = afterId ? tasks.findIndex((t) => t.id === afterId) + 1 : 0;
  return tasks.slice(start).find(open) ?? tasks.slice(0, start).find(open);
}
