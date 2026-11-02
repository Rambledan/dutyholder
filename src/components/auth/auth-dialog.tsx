"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { parseAuthMode, type AuthMode } from "@/lib/auth/routing";
import { cn } from "@/lib/utils";

// What the server found when it checked the invite token in the address.
export type InviteCheck =
  | { status: "none" }
  | { status: "invalid" }
  | { status: "valid"; email: string; token: string; next: string };

// Opens or closes the lightbox by changing ?auth= in the address bar. Next.js
// picks up the change without asking the server again, so it feels instant,
// and the back button closes it.
export function setAuthMode(mode: AuthMode | null) {
  const q = new URLSearchParams(window.location.search);
  if (mode) q.set("auth", mode);
  else for (const key of ["auth", "token", "next", "reason"]) q.delete(key);
  const query = q.toString();
  window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
}

export function AuthDialog({ invite }: { invite: InviteCheck }) {
  const params = useSearchParams();
  const mode = parseAuthMode(params.get("auth"));
  const ref = useRef<HTMLDialogElement>(null);

  // showModal() gives us the dimmed backdrop, Escape to close and focus
  // kept inside the box.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (mode && !dialog.open) dialog.showModal();
    if (!mode && dialog.open) dialog.close();
  }, [mode]);

  // Escape, or a click on the backdrop, closes it.
  const onClose = () => {
    if (new URLSearchParams(window.location.search).get("auth")) setAuthMode(null);
  };

  return (
    <dialog ref={ref} aria-labelledby="auth-title" onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-md bg-transparent p-0 text-foreground backdrop:bg-[rgb(15_18_34/0.5)] backdrop:backdrop-blur-[2px] open:animate-in open:fade-in-0 open:zoom-in-95">
      {mode && (
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-pop sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2.5 font-semibold">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="size-[18px]" strokeWidth={2.25} />
              </span>
              Dutyholder
            </span>
            <button type="button" onClick={() => ref.current?.close()}
              className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <X className="size-5" /><span className="sr-only">Close</span>
            </button>
          </div>

          <div role="tablist" aria-label="Sign in or sign up" className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setAuthMode(m)}
                className={cn("h-9 rounded-lg text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  mode === m ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground")}>
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {mode === "signin" ? <LoginForm onInvite={() => setAuthMode("signup")} /> : <SignUp invite={invite} />}
          </div>

          <p className="mt-6 text-center text-sm">
            <a href="/help" className="text-muted-foreground hover:underline">Help with signing in</a>
          </p>
        </div>
      )}
    </dialog>
  );
}

function SignUp({ invite }: { invite: InviteCheck }) {
  if (invite.status === "valid") return <SignupForm email={invite.email} token={invite.token} next={invite.next} />;
  return <InviteLinkForm invalid={invite.status === "invalid"} />;
}

// Accounts are by invitation only. Without a token in the address, ask for
// the link from the invite email; the server then checks it.
function InviteLinkForm({ invalid }: { invalid: boolean }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = inviteToken(link);
    if (!token) return setError("Paste the whole link from your invite email. It contains “token=”.");
    setError(null);
    const q = new URLSearchParams({ auth: "signup", token });
    const next = linkParam(link, "next");
    if (next) q.set("next", next);
    router.replace(`/?${q}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 id="auth-title" className="text-2xl font-medium tracking-[-0.02em]">Accept your invite</h2>
        <p className="text-sm text-muted-foreground">
          Dutyholder accounts are by invitation. The principal designer or client on your project sends the invite
          by email. Open the link in it, or paste it here.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error ?? (invalid
          ? "That invite link doesn't work. It may have expired (links last 7 days), already been used, or been copied incompletely."
          : null)} />
        <div className="space-y-2">
          <Label htmlFor="invite-link">Invite link</Label>
          <Input id="invite-link" autoFocus required value={link} onChange={(e) => setLink(e.target.value)}
            placeholder="https://dutyholder.vercel.app/signup?token=…" autoComplete="off" />
        </div>
        <Button type="submit" className="w-full">Continue</Button>
      </form>
    </div>
  );
}

function linkParam(link: string, key: string): string | null {
  try {
    return new URL(link.trim(), window.location.origin).searchParams.get(key);
  } catch {
    return null;
  }
}

function inviteToken(link: string): string | null {
  const token = linkParam(link, "token");
  return token && /^[\w-]{8,}$/.test(token) ? token : null;
}
