"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SHOWCASE_MAPS } from "@/lib/kairo/showcase-maps";
import { LandingTree } from "./LandingTree";
import { cn } from "@/lib/utils";

// Hero: copy left, the living map right (stacks on mobile so nothing overlaps).
// The map is the real product artifact and the only thing that glows gold.
export function LandingHero() {
  const [i, setI] = React.useState(1); // Fitness — a clean example with sub-steps
  const map = SHOWCASE_MAPS[i] ?? SHOWCASE_MAPS[0];

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-[calc(104px+env(safe-area-inset-top))] md:grid-cols-[0.9fr_1.1fr] md:gap-14 md:pb-28 md:pt-[17vh]">
      {/* copy */}
      <div className="max-w-md">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent/80">Map the way. Build the day.</div>
        <h1 className="mt-4 font-display text-[clamp(2.35rem,6vw,3.85rem)] font-semibold leading-[1.04] tracking-tight text-ink">
          Tell it your goal. Get today&apos;s plan.
        </h1>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
          Give Solaspace your goal, your time, and your energy. It builds a living map and one focused plan for today, then keeps it moving.
        </p>
        <div className="mt-8 flex flex-col items-start gap-2.5">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-full bg-[#f2f3f5] px-6 py-3 text-[15px] font-semibold text-[#0a0b0d] transition-all hover:bg-white"
          >
            Map my first goal <ArrowRight size={17} />
          </Link>
          <span className="text-[13px] text-faint">Free to start. No credit card.</span>
        </div>
      </div>

      {/* the living map — the one thing that glows */}
      <div className="relative mx-auto w-full max-w-[440px] md:max-w-none">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[70%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-[90px]"
          style={{ background: `radial-gradient(circle, ${map.color}26, transparent 70%)` }}
        />
        <div
          className="relative rounded-3xl border border-line-strong p-4 sm:p-6"
          style={{ background: "linear-gradient(180deg, rgba(20,22,27,0.55), rgba(10,11,13,0.55))" }}
        >
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: map.color, boxShadow: `0 0 7px ${map.color}` }} />
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{map.title}</span>
          </div>
          <LandingTree key={map.id} map={map} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">See one:</span>
          {SHOWCASE_MAPS.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setI(idx)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                idx === i ? "border-line-strong bg-white/[0.06] text-ink" : "border-line text-muted hover:text-ink"
              )}
            >
              {m.short}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
