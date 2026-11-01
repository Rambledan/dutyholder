"use client";

import { useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

// Calls save(value) about a second after the user stops typing, and once
// more when they leave the page. Returns a small status for the UI.
export function useAutosave<T>(value: T, save: (value: T) => Promise<{ error: string | null }>, enabled = true) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);
  const latest = useRef(value);
  const dirty = useRef(false);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    latest.current = value;
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled) return;
    dirty.current = true;
    const timer = setTimeout(async () => {
      setState("saving");
      const result = await saveRef.current(latest.current);
      dirty.current = false;
      setError(result.error);
      setState(result.error ? "error" : "saved");
    }, 1000);
    return () => clearTimeout(timer);
  }, [value, enabled]);

  // Save anything pending if the page is closed mid-typing.
  useEffect(() => {
    const flush = () => {
      if (dirty.current) void saveRef.current(latest.current);
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
