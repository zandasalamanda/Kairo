"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { SectionLabel } from "./PageHeader";

type Theme = "dark" | "light";

const KEY = "kairo.theme.v1";

// Stored as a RAW string (not JSON) so the pre-paint script in layout.tsx can
// read it with a plain === comparison and set the theme before first paint.
function readTheme(): Theme {
  if (typeof document !== "undefined") {
    const t = document.documentElement.dataset.theme;
    if (t === "light" || t === "dark") return t;
  }
  return "dark";
}

function applyTheme(theme: Theme) {
  try {
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f6f6f3" : "#0a0b0d");
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* private mode / quota — the in-memory dataset change still applies */
  }
}

const OPTIONS: { value: Theme; label: string; hint: string; Icon: typeof Moon }[] = [
  { value: "dark", label: "Dark", hint: "The original, calm at night", Icon: Moon },
  { value: "light", label: "Light", hint: "Bright and easy to read", Icon: Sun },
];

export function ThemeToggle() {
  // Render a stable server-safe default, then sync to the real theme on mount so
  // there's no hydration mismatch (the <html> attribute is set by the pre-paint script).
  const [theme, setTheme] = React.useState<Theme>("dark");
  React.useEffect(() => {
    // Sync to the real theme after mount. The <html> attribute is already set by
    // the pre-paint script, so this only reconciles the client render; the initial
    // "dark" keeps SSR and first client render identical (no hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readTheme());
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div className="panel rounded-2xl p-6">
      <SectionLabel className="mb-1.5">Appearance</SectionLabel>
      <p className="mb-4 text-[13px] text-muted">
        Choose how Solaspace looks. Your map and orbs keep their glow in either theme.
      </p>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="inset-well grid grid-cols-2 gap-1.5 rounded-2xl p-1.5"
      >
        {OPTIONS.map(({ value, label, hint, Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              role="radio"
              aria-checked={active}
              onClick={() => choose(value)}
              className={
                active
                  ? "raised-gold flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                  : "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-muted transition-colors hover:text-ink"
              }
            >
              <span
                className={
                  active
                    ? "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/10"
                    : "raised-btn grid h-9 w-9 shrink-0 place-items-center rounded-full"
                }
              >
                <Icon size={17} className={active ? "text-[#241809]" : "text-muted"} />
              </span>
              <span className="min-w-0">
                <span
                  className={
                    active
                      ? "block text-[15px] font-semibold text-[#241809]"
                      : "block text-[15px] font-semibold text-ink"
                  }
                >
                  {label}
                </span>
                <span className={active ? "block text-[12px] text-[#4a3208]" : "block text-[12px] text-faint"}>
                  {hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
