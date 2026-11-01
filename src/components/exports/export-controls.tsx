"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestExport } from "@/app/projects/export-actions";

export function ExportControls(props: { projectId: string; building: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // While a pack is being built, check back every few seconds.
  useEffect(() => {
    if (!props.building) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [props.building, router]);

  async function create() {
    setBusy(true);
    setError(null);
    const result = await requestExport(props.projectId);
    setBusy(false);
    if (result.error) setError(result.error);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button size="lg" onClick={create} disabled={busy || props.building}>
        {props.building ? "Building…" : busy ? "Starting…" : "Create evidence pack"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
