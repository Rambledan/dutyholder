import Link from "next/link";
import { Suspense } from "react";

// Common frame for signed-in pages below the home page.
export function PageShell(props: { back?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-4 text-sm">
        {props.back ? (
          <Link href={props.back.href} className="text-muted-foreground hover:underline">← {props.back.label}</Link>
        ) : <span />}
        <Link href="/help" className="text-muted-foreground hover:underline">Help</Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>{props.children}</Suspense>
    </main>
  );
}
