"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { TEMPLATES } from "@/lib/kairo/templates";
import { GOAL_PALETTE, goalColorHex } from "@/lib/kairo/goal-color";
import { templateToShowcaseMap, PENDING_MAP_KEY, type PendingMap } from "@/lib/kairo/guest-map";
import { goalIcon } from "@/lib/kairo/goal-icon";
import { ShowcaseTree } from "./ShowcaseTree";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// The anonymous "build before you sign up" surface (IKEA + reciprocity): pick a proven
// starter map, make it yours (colour), and watch it draw — no account, no AI. The
// account wall only appears at "Save my map", where the chosen template is handed to
// sign-up and persisted on the other side.
export function GuestBuild({ remote }: { remote: boolean }) {
  const router = useRouter();
  const [tid, setTid] = React.useState(TEMPLATES[0].id);
  const [colorIndex, setColorIndex] = React.useState(0);

  const t = TEMPLATES.find((x) => x.id === tid) ?? TEMPLATES[0];
  const hex = goalColorHex(t.id, colorIndex);
  const map = React.useMemo(() => templateToShowcaseMap(t, hex), [t, hex]);

  const save = () => {
    const pending: PendingMap = { templateId: t.id, colorIndex };
    try { window.sessionStorage.setItem(PENDING_MAP_KEY, JSON.stringify(pending)); } catch { /* private mode */ }
    track("guest_map_saved", { templateId: t.id });
    // In production the account wall is next; in demo mode there's no auth, so fall
    // back to the describe-your-goal flow.
    router.push(remote ? "/sign-up" : "/onboarding");
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col px-5 py-8">
      <div className="flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href="/sign-in" className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-ink">Sign in</Link>
      </div>

      <div className="mt-8 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Start with a plan that works.</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
          Preview a proven starter map, then create your free account to make it yours and start moving.
        </p>
      </div>

      {/* template picker */}
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {TEMPLATES.map((tp) => {
          const Icon = goalIcon(tp.icon);
          const active = tp.id === tid;
          return (
            <button
              key={tp.id}
              onClick={() => setTid(tp.id)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] transition-colors",
                active ? "border-accent/50 bg-accent/10 text-ink" : "border-line text-muted hover:border-accent/40 hover:text-ink"
              )}
            >
              <Icon size={14} style={active ? { color: hex } : undefined} /> {tp.title}
            </button>
          );
        })}
      </div>

      {/* preview — the real map, drawing itself */}
      <div className="panel-2 relative mt-6 overflow-hidden rounded-[28px] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: `${hex}1f`, transition: "background 0.6s ease" }} />
        <div className="relative text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
            {t.category} · {t.milestones.length} milestones · ~{t.targetWeeks} weeks
          </div>
          <h2 className="mt-1.5 font-display text-xl font-semibold text-ink">{t.title}</h2>
        </div>
        <div className="relative mt-3 min-h-[300px]">
          <ShowcaseTree map={map} interactive />
        </div>
        {/* make it yours — colour */}
        <div className="relative mt-2 flex items-center justify-center gap-2">
          {GOAL_PALETTE.map((c, i) => (
            <button key={c.name} onClick={() => setColorIndex(i)} aria-label={c.name} className="grid h-7 w-7 place-items-center rounded-full transition-transform hover:scale-110">
              <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: c.hex, boxShadow: i === colorIndex ? `0 0 0 2px var(--color-canvas), 0 0 0 4px ${c.hex}` : "none" }}>
                {i === colorIndex && <Check size={11} className="text-black/50" />}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* save */}
      <div className="mt-7 flex flex-col items-center gap-3 pb-4">
        <Button variant="primary" size="lg" onClick={save} className="w-full max-w-xs">Create my free account <ArrowRight size={16} /></Button>
        <Link href="/onboarding" className="text-[13px] text-faint transition-colors hover:text-muted">Prefer to describe your own goal?</Link>
      </div>
    </div>
  );
}
