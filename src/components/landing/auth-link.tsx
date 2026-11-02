"use client";

import { setAuthMode } from "@/components/auth/auth-dialog";
import type { AuthMode } from "@/lib/auth/routing";

// A real link (so it still works without JavaScript) that opens the sign-in
// lightbox in place instead of loading a new page.
export function AuthLink(props: { mode?: AuthMode; className?: string; children: React.ReactNode }) {
  const mode = props.mode ?? "signin";
  return (
    <a href={`/?auth=${mode}`} className={props.className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        setAuthMode(mode);
      }}>
      {props.children}
    </a>
  );
}
