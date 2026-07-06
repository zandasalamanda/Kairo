"use client";

import * as React from "react";

// Lightweight localStorage persistence for the demo, so edits survive reloads
// until a real backend (Supabase) is wired. SSR-safe; degrades to in-memory.

export function loadPersisted<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function savePersisted<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

/**
 * useState that hydrates from localStorage after mount (avoiding SSR hydration
 * mismatches) and persists on change.
 */
export function usePersistentState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(initial);
  const first = React.useRef(true);

  // hydrate once, client-only
  React.useEffect(() => {
    const saved = loadPersisted<T>(key);
    if (saved != null) setState(saved);
  }, [key]);

  // persist on change, skipping the initial mount so we don't clobber saved data
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    savePersisted(key, state);
  }, [key, state]);

  return [state, setState];
}
