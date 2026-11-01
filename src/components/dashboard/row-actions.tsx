"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { chaseNow, setChasingPaused } from "@/app/projects/dashboard-actions";

export function RowActions(props: { projectId: string; memberId: string; paused: boolean; canChase: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run(action: () => Promise<{ error: string | null; message?: string }>) {
    setBusy(true);
    setNote(null);
    const result = await action();
    setBusy(false);
    setNote(result.error ?? result.message ?? null);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <Button type="button" size="xs" variant="outline" disabled={busy}
          onClick={() => run(() => setChasingPaused(props.projectId, props.memberId, !props.paused))}>
          {props.paused ? "Resume" : "Pause"}
        </Button>
        {props.canChase && (
          <Button type="button" size="xs" variant="outline" disabled={busy}
            onClick={() => run(() => chaseNow(props.projectId, props.memberId))}>
            Chase now
          </Button>
        )}
      </div>
      {note && <p className="max-w-40 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
