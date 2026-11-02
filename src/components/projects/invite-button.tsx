"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { InviteResult } from "@/app/projects/actions";

export function InviteButton(props: {
  invitedAt: string | null;
  invite: () => Promise<InviteResult>;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function onClick() {
    setBusy(true);
    setCopied(false);
    setResult(await props.invite());
    setBusy(false);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onClick} disabled={busy}>
          {busy ? "Creating…" : props.invitedAt ? "Invite again" : "Invite"}
        </Button>
        {props.invitedAt && !result && (
          <span className="text-xs text-muted-foreground">
            Invited {new Date(props.invitedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>
      {result && !result.ok && <p className="text-xs text-destructive">{result.error}</p>}
      {result?.ok && result.sent && (
        <p className="text-xs text-success">
          {result.existingAccount ? `They already have an account: invitation emailed to ${result.email}.` : `Invite emailed to ${result.email}.`}
        </p>
      )}
      {result?.ok && !result.sent && !result.link && <p className="max-w-xs text-xs text-muted-foreground">{result.reason}</p>}
      {result?.ok && !result.sent && result.link && (
        <div className="max-w-xs space-y-1 text-xs">
          <p className="text-muted-foreground">{result.reason} Send them this link yourself (works once, 7 days):</p>
          <div className="flex gap-1">
            <input readOnly value={result.link ?? ""} className="min-w-0 flex-1 rounded border bg-muted px-1.5 py-1 font-mono"
              onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" size="sm" variant="outline" onClick={async () => {
              await navigator.clipboard.writeText(result.link ?? "");
              setCopied(true);
            }}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
