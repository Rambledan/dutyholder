"use client";

import { useId, useState } from "react";
import { hoursSaved } from "@/lib/landing";

const WORKING_DAY_HOURS = 7.5;

// Sliders for team size and projects a year; the totals update as you drag.
export function TimeCalculator() {
  const [people, setPeople] = useState(6);
  const [projects, setProjects] = useState(4);
  const [rate, setRate] = useState(75);

  const hours = hoursSaved(people, projects);
  const days = hours / WORKING_DAY_HOURS;
  const value = hours * rate;

  return (
    <div className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
      <div className="space-y-6">
        <Slider label="Dutyholders on a typical project" value={people} min={2} max={20} onChange={setPeople}
          hint="Client, principal designer, designers, principal contractor and contractors" />
        <Slider label="Projects a year" value={projects} min={1} max={24} onChange={setProjects} />
        <div className="space-y-2">
          <label htmlFor="rate" className="text-sm font-medium">Your hourly rate</label>
          <div className="flex h-10 items-center rounded-lg border border-input bg-card px-3 focus-within:ring-3 focus-within:ring-ring/50">
            <span className="text-muted-foreground">£</span>
            <input id="rate" type="number" inputMode="numeric" min={0} max={1000} value={rate}
              onChange={(e) => setRate(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
              className="w-full bg-transparent pl-1 tabular-nums outline-none" />
            <span className="shrink-0 text-sm text-muted-foreground">per hour</span>
          </div>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-col justify-between gap-6 rounded-2xl bg-nav-active p-6 text-nav-active-foreground sm:p-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] uppercase opacity-70">You get back each year</p>
          <p className="mt-2 text-6xl font-medium tracking-[-0.03em] tabular-nums sm:text-7xl">
            {Math.round(hours)}<span className="ml-2 text-2xl font-normal opacity-70">hours</span>
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t border-nav-active-foreground/15 pt-5">
          <div>
            <dt className="text-xs opacity-70">Working days</dt>
            <dd className="mt-1 text-2xl font-medium tabular-nums">{days.toFixed(days < 10 ? 1 : 0)}</dd>
          </div>
          <div>
            <dt className="text-xs opacity-70">Value of your time</dt>
            <dd className="mt-1 text-2xl font-medium tabular-nums">
              {value.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Slider(props: { label: string; hint?: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium">{props.label}</label>
        <span className="text-2xl font-medium tabular-nums">{props.value}</span>
      </div>
      <input id={id} type="range" min={props.min} max={props.max} value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-primary" />
      {props.hint && <p className="text-xs text-muted-foreground">{props.hint}</p>}
    </div>
  );
}
