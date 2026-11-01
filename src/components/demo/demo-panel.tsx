"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { advanceDemo, advanceDemoToNextEvent, type DemoResult } from "@/app/projects/demo-actions";

// Controls for a demo project: advance one simulated day, skip to the next
// thing that happens, or play one day per second until all green.
export function DemoPanel(props: { projectId: string; day: number; date: string; allGreen: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const playingRef = useRef(false);

  function record(result: DemoResult) {
    if (result.error) {
      setError(result.error);
      return false;
    }
    setError(null);
    setLog((l) => [`Day ${result.day}: ${result.events?.length ? result.events.join("; ") : "nothing happened"}`, ...l].slice(0, 30));
    router.refresh();
    return !result.allGreen;
  }

  async function once(action: () => Promise<DemoResult>) {
    setBusy(true);
    record(await action());
    setBusy(false);
  }

  async function play() {
    playingRef.current = true;
    setPlaying(true);
    while (playingRef.current) {
      const started = Date.now();
      const keepGoing = record(await advanceDemo(props.projectId));
      if (!keepGoing) break;
      await new Promise((r) => setTimeout(r, Math.max(0, 1000 - (Date.now() - started))));
    }
    playingRef.current = false;
    setPlaying(false);
  }

  useEffect(() => () => { playingRef.current = false; }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => once(() => advanceDemo(props.projectId))} disabled={busy || playing || props.allGreen}>
          Advance 1 day
        </Button>
        <Button variant="outline" onClick={() => once(() => advanceDemoToNextEvent(props.projectId))}
          disabled={busy || playing || props.allGreen}>
          Advance to next event
        </Button>
        {playing ? (
          <Button variant="outline" onClick={() => { playingRef.current = false; }}>Pause</Button>
        ) : (
          <Button variant="outline" onClick={play} disabled={busy || props.allGreen}>Play</Button>
        )}
        <span className="text-sm text-muted-foreground">
          Day {props.day} · {props.date}
          {props.allGreen && " · everything is complete"}
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {log.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}
    </div>
  );
}
