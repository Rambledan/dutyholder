"use client";

import { useState } from "react";

type Point = { day: number; date: string; complete: number; total: number };

const W = 640;
const H = 220;
const PAD = { top: 12, right: 16, bottom: 28, left: 36 };

// Chart roles (dataviz reference palette, series slot 1), light and dark.
// Kept with the chart so it never depends on a stylesheet being reloaded.
const VIZ_STYLES = `
.viz-root { --viz-series-1: #2a78d6; --viz-grid: #e5e4e0; --viz-muted: #6f6e69; --viz-surface: #ffffff; }
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) .viz-root { --viz-series-1: #3987e5; --viz-grid: #2e2e2c; --viz-muted: #a3a29b; --viz-surface: #1a1a19; }
}
:root[data-theme="dark"] .viz-root { --viz-series-1: #3987e5; --viz-grid: #2e2e2c; --viz-muted: #a3a29b; --viz-surface: #1a1a19; }
`;

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

// Items complete over simulated days. One series, so no legend: the title
// names it. 2px line, recessive grid, crosshair tooltip, and a table view.
export function ProgressChart({ history, total }: { history: Point[]; total: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const points: Point[] = [{ day: 0, date: "", complete: 0, total }, ...history];
  const maxDay = Math.max(7, points.at(-1)!.day);
  const x = (day: number) => PAD.left + (day / maxDay) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / Math.max(total, 1)) * (H - PAD.top - PAD.bottom);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.complete).toFixed(1)}`).join(" ");
  const yTicks = [0, Math.round(total / 2), total];
  const xTicks = Array.from({ length: Math.floor(maxDay / 7) + 1 }, (_, i) => i * 7);
  const active = hover !== null ? points[hover] : null;

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const day = ((e.clientX - box.left) / box.width) * maxDay;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.day - day) < Math.abs(points[best].day - day)) best = i;
    });
    setHover(best);
  }

  return (
    <figure className="viz-root space-y-2">
      <style>{VIZ_STYLES}</style>
      <figcaption className="text-sm font-medium">Items complete by simulated day</figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
          aria-label={`Items complete: ${points.at(-1)!.complete} of ${total} by day ${points.at(-1)!.day}`}>
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--viz-muted)">{t}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={`x${t}`} x={x(t)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--viz-muted)">
              {t === 0 ? "Day 0" : `Day ${t}`}
            </text>
          ))}
          <path d={path} fill="none" stroke="var(--viz-series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active && (
            <g>
              <line x1={x(active.day)} x2={x(active.day)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--viz-muted)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={x(active.day)} cy={y(active.complete)} r={4.5} fill="var(--viz-series-1)" stroke="var(--viz-surface)" strokeWidth={2} />
            </g>
          )}
          <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom}
            fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
        {active && (
          <div className="pointer-events-none absolute top-1 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm"
            style={{ left: `${(x(active.day) / W) * 100}%`, transform: "translateX(-50%)" }}>
            <div className="font-semibold">{active.complete} of {total}</div>
            <div className="text-muted-foreground">Day {active.day}{active.date && ` · ${fmt(active.date)}`}</div>
          </div>
        )}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Show as a table</summary>
        <table className="mt-2 w-full text-left">
          <thead><tr className="text-muted-foreground"><th className="py-1">Day</th><th>Date</th><th>Complete</th></tr></thead>
          <tbody>
            {history.map((p) => (
              <tr key={p.day} className="border-t"><td className="py-1">{p.day}</td><td>{fmt(p.date)}</td><td>{p.complete} of {p.total}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
