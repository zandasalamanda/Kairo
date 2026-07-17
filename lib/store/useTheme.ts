"use client";

import * as React from "react";

export type Theme = "light" | "dark";

/**
 * Reads the active theme from <html data-theme> (set by the pre-paint script in
 * layout.tsx and by ThemeToggle) and re-renders when it changes. SSR-safe: it
 * returns "dark" on the server and first client paint, then reconciles on mount.
 *
 * Used by the living map to swap "glow-on-black" orbs for "luminous sphere on
 * cream" in light mode — a treatment too different to express as pure CSS tokens.
 */
export function useTheme(): Theme {
  const [theme, setTheme] = React.useState<Theme>("dark");

  React.useEffect(() => {
    const el = document.documentElement;
    const read = () => setTheme(el.dataset.theme === "light" ? "light" : "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  return theme;
}
