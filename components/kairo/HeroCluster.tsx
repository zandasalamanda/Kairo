"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SHOWCASE_MAPS } from "@/lib/kairo/showcase-maps";
import { ShowcaseMiniMap } from "./ShowcaseMiniMap";

// The landing hero: a cluster of colored goal-planets orbiting the catchphrase.
// Drag to spin the system; click a planet to open its (pre-built) map. Pure
// Canvas for the orbit; the opened map is crisp SVG. Honours reduced motion.

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function HeroCluster() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const openIdRef = React.useRef<string | null>(null);
  React.useEffect(() => { openIdRef.current = openId; }, [openId]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const maps = SHOWCASE_MAPS;
    const N = maps.length;

    let w = 0, h = 0, raf = 0;
    let stars: { x: number; y: number; r: number; ph: number }[] = [];
    let pos: { x: number; y: number; r: number; id: string }[] = [];
    let rot = -0.5, vel = 0, hoverId: string | null = null;
    let dragging = false, moved = false, lastX = 0, downX = 0, downY = 0;
    const t0 = performance.now();

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: clamp(Math.round((w * h) / 8000), 40, 180) }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + 0.2, ph: Math.random() * Math.PI * 2,
      }));
    };

    const drawOrb = (x: number, y: number, r: number, hex: string, alpha: number, lit: boolean) => {
      ctx.globalAlpha = alpha;
      // glow
      const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.2);
      glow.addColorStop(0, `${hex}${lit ? "55" : "33"}`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
      // body
      const lx = x - r * 0.34, ly = y - r * 0.4;
      const body = ctx.createRadialGradient(lx, ly, r * 0.08, x, y, r * 1.08);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(0.3, hex);
      body.addColorStop(0.72, hex);
      body.addColorStop(1, "rgba(8,7,5,0.85)");
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      // specular
      const sp = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.6);
      sp.addColorStop(0, "rgba(255,255,255,0.55)");
      sp.addColorStop(1, "transparent");
      ctx.fillStyle = sp;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (lit) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      if (!w || !h) { layout(); if (!w || !h) { raf = requestAnimationFrame(frame); return; } }
      const t = (now - t0) / 1000;
      const p = reduce ? 1 : easeOut(clamp((now - t0) / 1600, 0, 1));
      const cx = w / 2, cy = h * 0.5;
      const Rx = Math.min(w * 0.34, 400) * (0.18 + 0.82 * p);
      const Ry = Rx * 0.4;
      const baseR = clamp(Math.min(w, h) * 0.05, 24, 58);

      if (!dragging) { rot += vel; vel *= 0.95; if (!reduce) rot += 0.0016; }

      ctx.clearRect(0, 0, w, h);
      // stars
      for (const s of stars) {
        const tw = reduce ? 0.5 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.ph));
        ctx.globalAlpha = tw * 0.6;
        ctx.fillStyle = "#cbd2df";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // central sun glow (brand)
      const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.4);
      sun.addColorStop(0, "rgba(230,184,119,0.14)");
      sun.addColorStop(0.5, "rgba(230,184,119,0.04)");
      sun.addColorStop(1, "transparent");
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);
      // faint orbit ring
      ctx.globalAlpha = 0.12 * p;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, Rx, Ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

      // planets, depth-sorted
      const planets = maps.map((m, i) => {
        const a = (i / N) * Math.PI * 2 + rot;
        const depth = (Math.sin(a) + 1) / 2; // 0 back .. 1 front
        return {
          m, id: m.id,
          x: cx + Math.cos(a) * Rx,
          y: cy + Math.sin(a) * Ry,
          r: baseR * (0.62 + 0.38 * depth) * (0.35 + 0.65 * p),
          alpha: (0.5 + 0.5 * depth) * p,
          depth,
        };
      }).sort((a, b) => a.depth - b.depth);

      pos = [];
      for (const pl of planets) {
        const lit = hoverId === pl.id;
        drawOrb(pl.x, pl.y, pl.r, pl.m.color, pl.alpha, lit);
        // label
        ctx.globalAlpha = clamp(pl.depth * 1.1, 0.25, 1) * p;
        ctx.fillStyle = lit ? "#f2f3f5" : "#9a9ea8";
        ctx.font = `${lit ? 600 : 500} 13px var(--font-sans), ui-sans-serif, system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(pl.m.short, pl.x, pl.y + pl.r + 18);
        ctx.globalAlpha = 1;
        pos.push({ x: pl.x, y: pl.y, r: pl.r + 8, id: pl.id });
      }
      raf = requestAnimationFrame(frame);
    };

    const hit = (mx: number, my: number) => {
      for (let i = pos.length - 1; i >= 0; i--) {
        const p = pos[i];
        if ((mx - p.x) ** 2 + (my - p.y) ** 2 <= p.r ** 2) return p;
      }
      return null;
    };

    const onDown = (e: PointerEvent) => {
      if (openIdRef.current) return;
      dragging = true; moved = false; lastX = e.clientX; downX = e.clientX; downY = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (dragging) {
        const dx = e.clientX - lastX; lastX = e.clientX;
        rot += dx * 0.006; vel = dx * 0.006;
        if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) moved = true;
      } else {
        const p = hit(mx, my);
        hoverId = p ? p.id : null;
        canvas.style.cursor = p ? "pointer" : "grab";
      }
    };
    const onUp = (e: PointerEvent) => {
      if (dragging && !moved) {
        const rect = canvas.getBoundingClientRect();
        const p = hit(e.clientX - rect.left, e.clientY - rect.top);
        if (p) setOpenId(p.id);
      }
      dragging = false;
    };

    layout();
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", () => { dragging = false; hoverId = null; });
    window.addEventListener("resize", layout);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", layout);
    };
  }, []);

  const openMap = openId ? SHOWCASE_MAPS.find((m) => m.id === openId) ?? null : null;

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      {/* Catchphrase + CTA, held in the eye of the system */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[36rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-canvas/50 blur-3xl" />
        <h1 className="relative font-display text-6xl font-semibold leading-[1.02] tracking-tight text-ink md:text-8xl">
          <span className="inline-block animate-fade-up" style={{ animationDelay: "0.1s" }}>Chart it.</span>{" "}
          <span className="inline-block animate-fade-up" style={{ animationDelay: "0.28s" }}>Focus.</span>{" "}
          <span className="inline-block animate-fade-up" style={{ animationDelay: "0.46s" }}>Arrive.</span>
        </h1>
        <div className="animate-fade-up relative mt-9 flex flex-col items-center gap-3" style={{ animationDelay: "0.62s" }}>
          <Link href="/onboarding" className="pointer-events-auto">
            <Button variant="primary" size="lg">Get started</Button>
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Drag to explore · tap a planet</span>
        </div>
      </div>

      {/* Opened showcase map */}
      {openMap && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-canvas/70 p-5 backdrop-blur-sm" onClick={() => setOpenId(null)}>
          <div className="chrome animate-sheet-up relative w-full max-w-2xl rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpenId(null)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:text-ink" aria-label="Close">
              <X size={17} />
            </button>
            <ShowcaseMiniMap map={openMap} />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span className="text-[13px] text-muted">A proven starter map — adopt it and make it yours in seconds.</span>
              <Link href="/onboarding"><Button variant="primary" size="sm">Start your map</Button></Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
