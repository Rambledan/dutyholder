"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HELP_TERMS } from "@/lib/help/content";
import { cn } from "@/lib/utils";

// A technical term with an ⓘ mark. Hover (or tap, on a phone) for a short
// definition and a link to the full help topic.
export function Term(props: { id: keyof typeof HELP_TERMS | string; children?: React.ReactNode; className?: string }) {
  const term = HELP_TERMS[props.id];
  if (!term) return <>{props.children}</>;
  return (
    <span className={cn("inline-flex items-baseline gap-0.5", props.className)}>
      {props.children}
      <Popover>
        <PopoverTrigger
          openOnHover
          delay={150}
          aria-label={`What does "${term.label}" mean?`}
          className="relative top-[0.12em] inline-flex shrink-0 cursor-help rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Info className="size-3.5" aria-hidden />
        </PopoverTrigger>
        <PopoverContent side="top" className="w-72 text-left font-normal normal-case tracking-normal">
          <p className="text-sm font-semibold">{term.label}</p>
          <p className="text-sm text-muted-foreground">{term.definition}</p>
          <Link href={`/help#${term.topic}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Read more in Help →
          </Link>
        </PopoverContent>
      </Popover>
    </span>
  );
}
