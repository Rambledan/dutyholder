"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/auth/form-error";
import { completeUploadItem } from "@/app/projects/task-actions";
import { FileList, type FileRow } from "./file-list";
import { FileUploader } from "./file-uploader";

export function UploadTask(props: {
  projectId: string;
  itemId: string;
  userId: string;
  files: FileRow[];
  complete: boolean;
  nextHref: string;
}) {
  const router = useRouter();
  const [files, setFiles] = useState(props.files);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function done() {
    setBusy(true);
    setError(null);
    const result = await completeUploadItem(props.projectId, props.itemId);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(result.next ?? props.nextHref);
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <FileList projectId={props.projectId} files={files} canWithdraw={!props.complete}
        onWithdrawn={(id) => setFiles((f) => f.filter((x) => x.id !== id))} />
      {!props.complete && (
        <>
          <FileUploader projectId={props.projectId} userId={props.userId} itemId={props.itemId}
            onUploaded={(f) => setFiles((prev) => [...prev, f])} />
          <Button type="button" size="lg" className="w-full sm:w-auto" onClick={done} disabled={busy || !files.length}>
            {busy ? "Saving…" : "Mark as done and continue"}
          </Button>
        </>
      )}
    </div>
  );
}
