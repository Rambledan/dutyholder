"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { registerUpload } from "@/app/projects/task-actions";
import { createClient } from "@/lib/supabase/client";
import type { FileRow } from "./file-list";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx,.xls,.xlsx";

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Uploads straight from the browser to the user's own folder in private
// storage, then asks the server to fingerprint and record each file.
export function FileUploader(props: {
  projectId: string;
  userId: string;
  itemId?: string;
  onUploaded: (file: FileRow) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList) {
    setError(null);
    for (const file of Array.from(files)) {
      if (!ALLOWED.has(file.type)) {
        setError(`${file.name}: only PDF, images, Word and Excel files are accepted.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is over 20 MB.`);
        continue;
      }
      setStatus(`Uploading ${file.name}…`);
      const sha256 = await sha256Hex(file);
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100);
      const path = `${props.userId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await createClient()
        .storage.from("evidence")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setError(`${file.name}: ${uploadError.message}`);
        continue;
      }

      setStatus(`Fingerprinting ${file.name}…`);
      const result = await registerUpload({
        projectId: props.projectId,
        path,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        sha256,
        itemId: props.itemId,
      });
      if (result.error || !result.file) setError(`${file.name}: ${result.error}`);
      else props.onUploaded(result.file);
    }
    setStatus(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" multiple accept={ACCEPT} className="hidden"
        onChange={(e) => e.target.files && upload(e.target.files)} />
      <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={Boolean(status)}>
        {status ?? "Add files"}
      </Button>
      <p className="text-xs text-muted-foreground">PDF, photos, Word or Excel, up to 20 MB each.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
