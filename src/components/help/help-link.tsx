import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { HELP_TOPICS } from "@/lib/help/content";
import { cn } from "@/lib/utils";

// A ? mark next to a heading, linking to the matching help topic.
export function HelpLink(props: { topic: string; className?: string }) {
  const topic = HELP_TOPICS.find((t) => t.id === props.topic);
  if (!topic) return null;
  return (
    <Link
      href={`/help#${topic.id}`}
      title={`Help: ${topic.title}`}
      aria-label={`Help: ${topic.title}`}
      className={cn(
        "relative top-[0.1em] inline-flex shrink-0 rounded-full align-baseline text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        props.className,
      )}
    >
      <CircleHelp className="size-4" aria-hidden />
    </Link>
  );
}
