import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// One question, one figure: overline label, big number, optional status
// badge and meter, and a caption saying what the number is measured against.
export function StatCard(props: {
  label: string;
  value: string;
  caption?: string;
  badge?: string;
  tone?: "warning" | "danger" | "success";
  meter?: number; // 0–1
  pending?: boolean; // dashed outline for projections and drafts
}) {
  const badgeVariant = props.tone === "danger" ? "destructive" : props.tone ?? "secondary";
  return (
    <div className={cn("rounded-3xl border bg-card p-6 text-card-foreground",
      props.pending ? "border-dashed border-input" : "border-border shadow-card")}>
      <p className="text-xs font-semibold tracking-[0.08em] text-subtle-foreground uppercase">{props.label}</p>
      <p className="mt-2 flex flex-wrap items-center gap-3 text-4xl font-medium tracking-[-0.02em] tabular-nums">
        {props.value}
        {props.badge && <Badge variant={badgeVariant}>{props.badge}</Badge>}
      </p>
      {props.meter !== undefined && (
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar"
          aria-valuenow={Math.round(props.meter * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(props.meter * 100)}%` }} />
        </div>
      )}
      {props.caption && <p className="mt-2 text-[13px] leading-[18px] text-muted-foreground">{props.caption}</p>}
    </div>
  );
}
