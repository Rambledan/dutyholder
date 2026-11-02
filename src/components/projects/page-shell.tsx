import Link from "next/link";
import { Suspense } from "react";
import { AppFrame } from "@/components/nav/app-frame";

// Common frame for signed-in pages below the home page.
export function PageShell(props: { back?: { href: string; label: string }; width?: "default" | "wide"; children: React.ReactNode }) {
  return (
    <AppFrame width={props.width}>
      {props.back && (
        <div className="mb-4 text-sm">
          <Link href={props.back.href} className="text-muted-foreground hover:text-foreground hover:underline">← {props.back.label}</Link>
        </div>
      )}
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>{props.children}</Suspense>
    </AppFrame>
  );
}
