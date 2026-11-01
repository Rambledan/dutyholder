"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fileLink, withdrawDocument } from "@/app/projects/task-actions";

export type FileRow = { id: string; fileName: string; sizeBytes: number; sha256: string; createdAt?: string };

export function formatBytes(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Uploaded files with their fingerprint, a 60-second view link and, while
// still editable, a "withdraw" option that keeps the file on record.
export function FileList(props: { projectId: string; files: FileRow[]; canWithdraw: boolean; onWithdrawn?: (id: string) => void }) {
  const [error, setError] = useState<string | null>(null);

  async function open(id: string) {
    setError(null);
    const result = await fileLink(id);
    if (result.url) window.open(result.url, "_blank", "noopener");
    else setError(result.error);
  }

  async function withdraw(id: string) {
    const reason = window.prompt("Why are you withdrawing this file? (It stays on record.)");
    if (!reason) return;
    const result = await withdrawDocument(props.projectId, id, reason);
    if (result.error) setError(result.error);
    else props.onWithdrawn?.(id);
  }

  if (!props.files.length) return <p className="text-sm text-muted-foreground">No files yet.</p>;

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="divide-y rounded-lg border">
        {props.files.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{f.fileName}</div>
              <div className="font-mono text-xs text-muted-foreground" title={`SHA-256 ${f.sha256}`}>
                {formatBytes(f.sizeBytes)} · SHA-256 {f.sha256.slice(0, 12)}…
              </div>
            </div>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => open(f.id)}>View</Button>
              {props.canWithdraw && (
                <Button type="button" size="sm" variant="ghost" onClick={() => withdraw(f.id)}>Withdraw</Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
