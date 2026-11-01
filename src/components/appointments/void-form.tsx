"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { voidAppointment } from "@/app/projects/appointment-actions";

export function VoidButton(props: { projectId: string; appointmentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    const reason = window.prompt("Why are you voiding this letter? (It stays on record.)");
    if (!reason) return;
    const result = await voidAppointment(props.projectId, props.appointmentId, reason);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" size="sm" onClick={onClick}>Void this letter</Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
