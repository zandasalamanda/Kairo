"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SHOWCASE_MAPS } from "@/lib/kairo/showcase-maps";
import { PlanetOrb } from "./PlanetOrb";
import { ShowcaseTree } from "./ShowcaseTree";
import { Button } from "@/components/ui/Button";

// The landing's "show, don't tell" moment: a real goal map floating in space (grid +
// core glow, like the app — not a boxed card) that draws itself, cross-fades between
// sample goals, drifts with your cursor, and lets you tap any step to see the actual
// research behind it. The cycle pauses on hover and stops for good once you interact.
export function LiveMapDemo() {
  const [i, setI] = React.useState(0);
  const [visible, setVisible] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [stopped, setStopped] = React.useState(false);
  const areaRef = React.useRef<HTMLDivElement>(null);
  const treeWrapRef = React.useRef<HTMLDivElement>(null);
  const firstFade = React.useRef(true);

  const paused = sheetOpen || hovered || stopped;

  React.useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setI((p) => (p + 1) % SHOWCASE_MAPS.length), 8500);
    return () => window.clearInterval(id);
  }, [paused]);

  // Clean cross-fade whenever the sample goal changes.
  React.useEffect(() => {
    if (firstFade.current) { firstFade.current = false; return; }
    setVisible(false);
    const t = window.setTimeout(() => setVisible(true), 240);
    return () => window.clearTimeout(t);
  }, [i]);

  // Keep the parallax settled while a research sheet is open.
  React.useEffect(() => {
    if (sheetOpen && treeWrapRef.current) treeWrapRef.current.style.transform = "translate(0px, 0px)";
  }, [sheetOpen]);

  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const onMove = (e: React.MouseEvent) => {
    const area = areaRef.current, wrap = treeWrapRef.current;
    if (!area || !wrap || reduce || sheetOpen) return;
    const r = area.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    wrap.style.transform = `translate(${(dx * 16).toFixed(1)}px, ${(dy * 11).toFixed(1)}px)`;
  };
  const onLeave = () => {
    setHovered(false);
    if (treeWrapRef.current) treeWrapRef.current.style.transform = "translate(0px, 0px)";
  };

  const map = SHOWCASE_MAPS[i];

  return (
    <div className="relative isolate overflow-hidden rounded-[32px] px-3 py-10 md:py-14">
      {/* space backdrop — a faint grid + a soft core glow tinted to the goal's colour */}
      <div className="grid-veil pointer-events-none absolute inset-0 -z-10 opacity-30" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] max-w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: `${map.color}14`, transition: "background 1s ease" }}
      />

      <div className="text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">Watch a goal become a plan</div>
        <div className="mt-2.5 flex items-center justify-center gap-2.5" style={{ opacity: visible ? 1 : 0, transition: "opacity .24s ease" }}>
          <PlanetOrb hex={map.color} size={26} icon={map.icon} seed={map.id} />
          <h3 className="font-display text-xl font-semibold text-ink transition-colors md:text-2xl">{map.title}</h3>
        </div>
        <p className="mx-auto mt-2 max-w-sm text-[13px] text-muted">Tap any step to see the research picked for it — real videos and cited guides.</p>
      </div>

      <div
        ref={areaRef}
        className="mt-6 min-h-[320px]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onLeave}
        onMouseMove={onMove}
      >
        <div ref={treeWrapRef} style={{ opacity: visible ? 1 : 0, transition: "opacity .24s ease, transform .25s ease" }}>
          <ShowcaseTree map={map} interactive onOpenChange={setSheetOpen} onInteract={() => setStopped(true)} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {SHOWCASE_MAPS.map((m, idx) => (
          <button key={m.id} onClick={() => { setStopped(true); setI(idx); }} aria-label={`Show ${m.short} plan`} className="grid place-items-center p-1">
            <span
              className="block h-1.5 rounded-full transition-all duration-300"
              style={{ width: idx === i ? 22 : 6, background: idx === i ? m.color : "rgba(255,255,255,0.18)" }}
            />
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Link href="/build">
          <Button variant="primary" size="lg">Map your goal <ArrowRight size={16} /></Button>
        </Link>
      </div>
    </div>
  );
}
