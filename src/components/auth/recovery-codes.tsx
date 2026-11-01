"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Shows freshly issued recovery codes once, with copy and download buttons.
export function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  function download() {
    const blob = new Blob(
      [`Dutyholder recovery codes\nEach code works once. Keep them somewhere safe.\n\n${text}\n`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dutyholder-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        }}>
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          Download .txt
        </Button>
      </div>
    </div>
  );
}
