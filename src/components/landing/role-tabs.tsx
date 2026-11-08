"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type RoleTab = { role: string; headline: string; points: string[] };

// One dutyholder at a time, so the page stays short.
export function RoleTabs({ tabs }: { tabs: RoleTab[] }) {
  const [active, setActive] = useState(0);
  const tab = tabs[active];
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Dutyholders" className="flex flex-wrap gap-2">
        {tabs.map((t, i) => (
          <button key={t.role} type="button" role="tab" id={`tab-${i}`} aria-selected={i === active} aria-controls="role-panel"
            onClick={() => setActive(i)}
            className={cn("rounded-full px-4 py-2 text-[15px] font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              i === active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {t.role}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="role-panel" aria-labelledby={`tab-${active}`} className="rounded-3xl border border-border bg-background p-6 sm:p-8">
        <h3 className="text-2xl font-medium tracking-[-0.02em]">{tab.headline}</h3>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] text-muted-foreground">
          {tab.points.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </div>
    </div>
  );
}
