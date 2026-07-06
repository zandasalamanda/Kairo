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
 *
 * `enabled` = false makes it a plain useState (no localStorage). Used when a
 * real backend is wired: the server holds canonical state and localStorage
 * would otherwise clobber it with stale demo data.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  enabled = true
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(initial);
  const first = React.useRef(true);

  // hydrate once, client-only
  React.useEffect(() => {
    if (!enabled) return;
    const saved = loadPersisted<T>(key);
    if (saved != null) setState(saved);
  }, [key, enabled]);

  // persist on change, skipping the initial mount so we don't clobber saved data
  React.useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    savePersisted(key, state);
  }, [key, state, enabled]);

  return [state, setState];
}
