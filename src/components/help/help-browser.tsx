"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { HELP_CATEGORIES, HELP_TERMS, HELP_TOPICS, type HelpBlock } from "@/lib/help/content";

function text(blocks: HelpBlock[]): string {
  return blocks.map((b) => ("p" in b ? b.p : "note" in b ? b.note : b.list.join(" "))).join(" ");
}

function Block({ block }: { block: HelpBlock }) {
  if ("p" in block) return <p>{block.p}</p>;
  if ("note" in block) return <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">{block.note}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {block.list.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

// Every help topic, grouped by category, with a search box that filters
// topics and glossary terms as you type.
export function HelpBrowser() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const topics = useMemo(
    () => (q ? HELP_TOPICS.filter((t) => `${t.title} ${t.summary} ${text(t.body)}`.toLowerCase().includes(q)) : HELP_TOPICS),
    [q],
  );
  const terms = useMemo(
    () => Object.values(HELP_TERMS)
      .filter((t) => !q || `${t.label} ${t.definition}`.toLowerCase().includes(q))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [q],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <label htmlFor="help-search" className="sr-only">Search help</label>
        <Input id="help-search" type="search" placeholder="Search help, e.g. recovery code, domestic client, fingerprint"
          className="h-11 text-base" value={query} onChange={(e) => setQuery(e.target.value)} />
        {q && <p className="text-sm text-muted-foreground">{topics.length} topic{topics.length === 1 ? "" : "s"} found</p>}
      </div>

      {!q && (
        <nav aria-label="Help topics" className="grid gap-6 sm:grid-cols-2">
          {HELP_CATEGORIES.map((c) => (
            <div key={c}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{c}</h2>
              <ul className="space-y-1 text-sm">
                {HELP_TOPICS.filter((t) => t.category === c).map((t) => (
                  <li key={t.id}><a href={`#${t.id}`} className="hover:underline">{t.title}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}

      <div className="space-y-6">
        {topics.map((t) => (
          <article key={t.id} id={t.id}
            className="scroll-mt-6 space-y-3 rounded-xl border p-5 text-[15px] leading-relaxed target:border-primary target:ring-2 target:ring-primary/20">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.category}</p>
            <h2 className="text-lg font-semibold leading-snug">
              <a href={`#${t.id}`} className="hover:underline">{t.title}</a>
            </h2>
            <p className="text-muted-foreground">{t.summary}</p>
            {t.body.map((b, i) => <Block key={i} block={b} />)}
          </article>
        ))}
      </div>

      <section id="glossary" className="scroll-mt-6 space-y-3">
        <h2 className="text-lg font-semibold">Glossary</h2>
        <dl className="divide-y rounded-xl border text-sm">
          {terms.map((t) => (
            <div key={t.label} className="grid gap-1 p-3 sm:grid-cols-[12rem_1fr]">
              <dt className="font-medium">{t.label}</dt>
              <dd className="text-muted-foreground">
                {t.definition} <a href={`#${t.topic}`} className="whitespace-nowrap text-primary hover:underline">More →</a>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
