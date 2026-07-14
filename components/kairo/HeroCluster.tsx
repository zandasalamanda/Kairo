"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { SHOWCASE_MAPS } from "@/lib/kairo/showcase-maps";
import { PlanetOrb } from "./PlanetOrb";
import { ShowcaseTree } from "./ShowcaseTree";

// The landing hero: real glossy goal-planets (embossed icons, same as the map)
// orbiting the catchphrase. Drag to spin; click a planet to open its map. A
// background canvas draws the starfield, central glow, and orbit ring.

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function HeroCluster() {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const planetRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const movedRef = React.useRef(false);
  const hoverRef = React.useRef<number | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const openIdRef = React.useRef<string | null>(null);
  React.useEffect(() => { openIdRef.current = openId; }, [openId]);

  React.useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = SHOWCASE_MAPS.length;
    let w = 0, h = 0, raf = 0;
    let stars: { x: number; y: number; r: number; ph: number }[] = [];
    let rot = -0.5, vel = 0, dragging = false, lastX = 0, downX = 0, downY = 0;
    const t0 = performance.now();

    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      w = rect.width; h = rect.height;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: clamp(Math.round((w * h) / 8000), 40, 180) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + 0.2, ph: Math.random() * Math.PI * 2 }));
    };

    const frame = (now: number) => {
      if (!w || !h) { layout(); if (!w || !h) { raf = requestAnimationFrame(frame); return; } }
      const t = (now - t0) / 1000;
      const p = reduce ? 1 : easeOut(clamp((now - t0) / 1600, 0, 1));
      // On mobile the text sits at the top, so the cluster lives in the lower half
      // (and the planets shrink) — otherwise everything piles onto the centre.
      const mobile = w < 768;
      const cx = w / 2, cy = h * (mobile ? 0.66 : 0.5);
      const Rx = (mobile ? w * 0.42 : Math.min(w * 0.34, 400)) * (0.2 + 0.8 * p);
      const Ry = Rx * (mobile ? 0.52 : 0.4);
      const sizeK = mobile ? 0.66 : 1;

      if (!dragging) { rot += vel; vel *= 0.95; if (!reduce) rot += 0.0015; }

      // background canvas: stars, central glow, orbit ring
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = reduce ? 0.5 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.ph));
        ctx.globalAlpha = tw * 0.6; ctx.fillStyle = "#cbd2df";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.42);
      sun.addColorStop(0, "rgba(230,184,119,0.13)");
      sun.addColorStop(0.5, "rgba(230,184,119,0.035)");
      sun.addColorStop(1, "transparent");
      ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.1 * p; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, Rx, Ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

      // position the real DOM planets along the orbit
      for (let i = 0; i < N; i++) {
        const el = planetRefs.current[i];
        if (!el) continue;
        if (openIdRef.current) { el.style.opacity = "0"; continue; } // hide behind the open map
        const a = (i / N) * Math.PI * 2 + rot;
        const depth = (Math.sin(a) + 1) / 2;
        const x = cx + Math.cos(a) * Rx;
        const y = cy + Math.sin(a) * Ry;
        const hover = hoverRef.current === i ? 1.08 : 1;
        const scale = (0.62 + 0.38 * depth) * (0.4 + 0.6 * p) * hover * sizeK;
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        el.style.opacity = ((0.55 + 0.45 * depth) * p).toFixed(3);
        el.style.zIndex = String(Math.round(depth * 100));
      }
      raf = requestAnimationFrame(frame);
    };

    const onDown = (e: PointerEvent) => {
      if (openIdRef.current) return;
      // Don't hijack clicks on a control (the CTA link/button) into a drag —
      // otherwise the pointer capture below swallows the click.
      if ((e.target as HTMLElement | null)?.closest("a, button")) return;
      dragging = true; movedRef.current = false; lastX = e.clientX; downX = e.clientX; downY = e.clientY;
      try { wrap.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      rot += dx * 0.006; vel = dx * 0.006;
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) movedRef.current = true;
    };
    const onUp = (e: PointerEvent) => {
      const wasDragging = dragging;
      dragging = false;
      if (openIdRef.current || movedRef.current || !wasDragging) return;
      // pointer capture suppresses the child click, so hit-test by coordinates
      const t = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const id = t?.closest<HTMLElement>("[data-map-id]")?.dataset.mapId;
      if (id) setOpenId(id);
    };

    layout();
    wrap.style.cursor = "grab";
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    window.addEventListener("resize", layout);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", layout);
    };
  }, []);

  const openMap = openId ? SHOWCASE_MAPS.find((m) => m.id === openId) ?? null : null;

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      {/* real glossy planets — positioned each frame by the rAF loop */}
      {SHOWCASE_MAPS.map((m, i) => (
        <div
          key={m.id}
          ref={(el) => { planetRefs.current[i] = el; }}
          data-map-id={m.id}
          className="absolute left-0 top-0 z-10 cursor-pointer"
          style={{ willChange: "transform", opacity: 0 }}
          onMouseEnter={() => { hoverRef.current = i; }}
          onMouseLeave={() => { if (hoverRef.current === i) hoverRef.current = null; }}
        >
          <PlanetOrb hex={m.color} size={104} icon={m.icon} seed={m.id} />
          <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-muted" style={{ textShadow: "0 1px 10px rgba(8,9,11,0.95)" }}>
            {m.short}
          </span>
        </div>
      ))}

      {/* catchphrase + CTA — top on mobile (cluster sits below), centred on desktop */}
      <div className="pointer-events-none absolute inset-0 z-[120] flex flex-col items-center justify-start px-5 pt-[13vh] text-center md:justify-center md:pt-0">
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-64 w-[38rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-canvas/55 blur-3xl md:block" />
        <h1 className="relative font-display text-[2.75rem] font-semibold leading-[1.04] tracking-tight text-ink sm:text-6xl md:text-8xl">
          <span className="inline-block animate-fade-up" style={{ animationDelay: "0.1s" }}>Chart it.</span>{" "}
          <span className="inline-block animate-fade-up" style={{ animationDelay: "0.28s" }}>Focus.</span>{" "}
          <span className="inline-block animate-fade-up" style={{ animationDelay: "0.46s" }}>Arrive.</span>
        </h1>
        <div className="animate-fade-up relative mt-7 flex flex-col items-center gap-3 md:mt-9" style={{ animationDelay: "0.56s" }}>
          <Link href="/onboarding" className={buttonVariants({ variant: "primary", size: "lg", className: "pointer-events-auto" })}>Get started</Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Drag to explore · tap a goal</span>
        </div>
      </div>

      {/* opened showcase map — a clean, legible preview of the plan. Above the
          hero catchphrase (z-120) so the big title never overlaps it. */}
      {openMap && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-canvas/95 p-5 backdrop-blur-md" onClick={() => setOpenId(null)}>
          <div className="animate-sheet-up relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line-strong shadow-2xl" style={{ background: "#0f1116" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpenId(null)} className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:text-ink" aria-label="Close">
              <X size={17} />
            </button>
            <div className="overflow-y-auto px-5 pb-3 pt-7 sm:px-6">
              <div className="text-center">
                <h3 className="font-display text-xl font-semibold text-ink">{openMap.title}</h3>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Starter map · {openMap.milestones.length} milestones</div>
              </div>
              {/* the real 2D goal map, exactly as it looks in the app */}
              <div className="mt-3">
                <ShowcaseTree map={openMap} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
              <span className="text-[13px] text-muted">A proven starter map. Yours in seconds.</span>
              <Link href="/onboarding"><Button variant="primary" size="sm">Start your map</Button></Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
