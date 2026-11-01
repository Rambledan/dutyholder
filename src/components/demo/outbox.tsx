const KIND_LABEL: Record<string, string> = {
  nudge: "Nudge", reminder: "Reminder", firm: "Firm reminder", owner_digest: "Owner digest", manual: "Chased by you",
};

export type OutboxEntry = {
  id: string;
  day: string;
  to: string;
  cc: string[];
  kind: string;
  subject: string | null;
  body: string | null;
};

// What each fictional person would have received. Nothing here was emailed.
export function Outbox({ entries }: { entries: OutboxEntry[] }) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">No emails yet. Advance the demo to see reminders appear.</p>;
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {entries.map((e) => (
        <li key={e.id}>
          <details className="group">
            <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 p-3 hover:bg-muted/40">
              <span className="min-w-0">
                <span className="font-medium">{e.subject ?? KIND_LABEL[e.kind]}</span>
                <span className="block text-xs text-muted-foreground">
                  To {e.to}{e.cc.length > 0 && `, cc ${e.cc.join(", ")}`}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(`${e.day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                {KIND_LABEL[e.kind] ?? e.kind}
              </span>
            </summary>
            <pre className="whitespace-pre-wrap border-t bg-muted/20 p-3 font-sans text-xs leading-relaxed">{e.body}</pre>
          </details>
        </li>
      ))}
    </ul>
  );
}
