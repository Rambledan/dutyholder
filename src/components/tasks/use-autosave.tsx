"use client";

import { useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

// Calls save(value) about a second after the user stops typing, and once
// more when they leave the page. Only saves when the value really differs
// from what was loaded or last saved, so re-running effects (React does this
// in development, and when a page is restored) never writes anything.
export function useAutosave<T>(value: T, save: (value: T) => Promise<{ error: string | null }>, enabled = true) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(JSON.stringify(value));
  const latest = useRef(value);
  const enabledRef = useRef(enabled);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
    enabledRef.current = enabled;
  }, [save, enabled]);

  const isDirty = () => enabledRef.current && JSON.stringify(latest.current) !== saved.current;

  useEffect(() => {
    latest.current = value;
    if (!enabled || !isDirty()) return;
    const timer = setTimeout(async () => {
      const snapshot = JSON.stringify(latest.current);
      setState("saving");
      const result = await saveRef.current(latest.current);
      if (!result.error) saved.current = snapshot;
      setError(result.error);
      setState(result.error ? "error" : "saved");
    }, 1000);
    return () => clearTimeout(timer);
  }, [value, enabled]);

  // Save anything pending if the page is closed mid-typing.
  useEffect(() => {
    const flush = () => {
      if (isDirty()) void saveRef.current(latest.current);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  return { state, error };
}

export function SaveStatus({ state, error }: { state: SaveState; error: string | null }) {
  const text =
    state === "saving" ? "Saving…" : state === "saved" ? "All changes saved" : state === "error" ? `Not saved: ${error}` : "Saves automatically";
  return (
    <p className={state === "error" ? "text-xs text-destructive" : "text-xs text-muted-foreground"} aria-live="polite">
      {text}
    </p>
  );
}
