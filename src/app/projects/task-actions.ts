"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAal2 } from "@/lib/auth/server";
import { loadMyTasks, nextTask } from "@/lib/tasks";

export type ActionResult = { error: string | null };
// After finishing a task: where to go next, worked out from fresh data.
export type DoneResult = ActionResult & { next?: string };

const ok: ActionResult = { error: null };
const fail = (message: string | undefined, fallback: string): ActionResult => ({ error: message ?? fallback });

async function nextPath(projectId: string, itemId: string): Promise<string> {
  const { supabase, userId } = await requireAal2();
  const { tasks } = await loadMyTasks(supabase, projectId, userId);
  const next = nextTask(tasks, itemId);
  return next ? `/projects/${projectId}/tasks/${next.id}` : `/projects/${projectId}/tasks`;
}

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/");
}

export async function signAcknowledgement(projectId: string, itemId: string, typedName: string): Promise<DoneResult> {
  const { supabase } = await requireAal2();
  const userAgent = (await headers()).get("user-agent");
  const { error } = await supabase.rpc("sign_acknowledgement", {
    p_item_id: itemId,
    p_typed_name: typedName,
    p_user_agent: userAgent ?? undefined,
  });
  if (error) return fail(error.message, "Couldn't save your signature.");
  refresh(projectId);
  return { error: null, next: await nextPath(projectId, itemId) };
}

export async function saveItemAnswer(itemId: string, text: string): Promise<ActionResult> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("save_item_answer", { p_item_id: itemId, p_text: text });
  return error ? fail(error.message, "Couldn't save.") : ok;
}

export async function completeFormItem(projectId: string, itemId: string): Promise<DoneResult> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("complete_form_item", { p_item_id: itemId });
  if (error) return fail(error.message, "Couldn't complete the task.");
  refresh(projectId);
  return { error: null, next: await nextPath(projectId, itemId) };
}

export async function completeUploadItem(projectId: string, itemId: string): Promise<DoneResult> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("complete_upload_item", { p_item_id: itemId });
  if (error) return fail(error.message, "Couldn't complete the task.");
  refresh(projectId);
  return { error: null, next: await nextPath(projectId, itemId) };
}

export type CompetenceFields = {
  skills: string;
  knowledge: string;
  experience: string;
  behaviour_compliance: string;
  behaviour_cooperation: string;
  behaviour_limits: string;
  organisational_capability: string;
  has_serious_sanctions: boolean | null;
  sanctions_details: string;
};

// Autosave: make sure there's a draft, then write the fields to it. Only the
// answer fields are copied across, whatever else the browser sends.
export async function saveCompetence(fields: CompetenceFields): Promise<ActionResult & { savedAt?: string }> {
  const { supabase } = await requireAal2();
  const { data: draftId, error: draftError } = await supabase.rpc("start_competence_draft");
  if (draftError || !draftId) return fail(draftError?.message, "Couldn't save.");
  const answers: CompetenceFields = {
    skills: String(fields.skills ?? ""),
    knowledge: String(fields.knowledge ?? ""),
    experience: String(fields.experience ?? ""),
    behaviour_compliance: String(fields.behaviour_compliance ?? ""),
    behaviour_cooperation: String(fields.behaviour_cooperation ?? ""),
    behaviour_limits: String(fields.behaviour_limits ?? ""),
    organisational_capability: String(fields.organisational_capability ?? ""),
    has_serious_sanctions: typeof fields.has_serious_sanctions === "boolean" ? fields.has_serious_sanctions : null,
    sanctions_details: String(fields.sanctions_details ?? ""),
  };
  const { error } = await supabase.from("competence_statements").update(answers).eq("id", draftId);
  if (error) return fail(error.message, "Couldn't save.");
  return { error: null, savedAt: new Date().toISOString() };
}

export async function startCompetenceRevision(projectId: string): Promise<ActionResult> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("start_competence_draft");
  if (error) return fail(error.message, "Couldn't start a new version.");
  refresh(projectId);
  return ok;
}

export async function submitCompetence(projectId: string, itemId: string): Promise<DoneResult> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("submit_competence", { p_item_id: itemId });
  if (error) return fail(error.message, "Couldn't submit.");
  refresh(projectId);
  return { error: null, next: await nextPath(projectId, itemId) };
}

export type UploadedFile = {
  id: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
};

// The browser has uploaded the file straight to private storage. Here the
// server downloads it, works out its SHA-256 fingerprint itself, checks it
// matches what the browser calculated, and records it.
export async function registerUpload(input: {
  projectId: string;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  itemId?: string;
}): Promise<ActionResult & { file?: UploadedFile }> {
  const { supabase } = await requireAal2();

  const { data: blob, error: downloadError } = await supabase.storage.from("evidence").download(input.path);
  if (downloadError || !blob) return fail(downloadError?.message, "The upload couldn't be found.");
  const bytes = Buffer.from(await blob.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== input.sha256.toLowerCase()) {
    return { error: "The file changed during upload. Please try again." };
  }

  const { data: id, error } = await supabase.rpc("register_document", {
    p_storage_path: input.path,
    p_file_name: input.fileName,
    p_mime_type: input.mimeType,
    p_size_bytes: bytes.length,
    p_sha256: sha256,
    p_item_id: input.itemId,
  });
  if (error || !id) return fail(error?.message, "Couldn't record the upload.");
  refresh(input.projectId);
  return { error: null, file: { id, fileName: input.fileName, sizeBytes: bytes.length, sha256 } };
}

export async function withdrawDocument(projectId: string, documentId: string, reason: string): Promise<ActionResult> {
  const { supabase } = await requireAal2();
  const { error } = await supabase.rpc("withdraw_document", { p_document_id: documentId, p_reason: reason });
  if (error) return fail(error.message, "Couldn't withdraw the file.");
  refresh(projectId);
  return ok;
}

// A link to open a file that stops working after 60 seconds.
export async function fileLink(documentId: string): Promise<ActionResult & { url?: string }> {
  const { supabase } = await requireAal2();
  const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", documentId).maybeSingle();
  if (!doc) return { error: "File not found." };
  const { data, error } = await supabase.storage.from("evidence").createSignedUrl(doc.storage_path, 60);
  if (error || !data) return fail(error?.message, "Couldn't open the file.");
  return { error: null, url: data.signedUrl };
}
