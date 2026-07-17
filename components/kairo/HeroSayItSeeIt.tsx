"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Pencil } from "lucide-react";
import { SHOWCASE_MAPS } from "@/lib/kairo/showcase-maps";
import { ShowcaseTree } from "./ShowcaseTree";

// "Say it, see it": a plain-English goal types itself into a box, then the whole
// ordered plan draws itself below, with a real video/guide on the next step. It
// cycles through real example goals and demands zero interaction.
//
// Every frame here is CANNED (SHOWCASE_MAPS + ShowcaseTree, static data) — it
// makes NO AI call and spends NO tokens. The button hands off to /onboarding,
// which captures the goal and sends anonymous visitors to sign up before Sola
// generates anything. So nothing real is produced until there's an account.

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(m.matches);
    read();
    m.addEventListener("change", read);
    return () => m.removeEventListener("change", read);
  }, []);
  return reduced;
}

export function HeroSayItSeeIt() {
  const reduce = usePrefersReducedMotion();
  const [i, setI] = React.useState(0);
  const [typed, setTyped] = React.useState("");
  const [mapped, setMapped] = React.useState(false);
  const map = SHOWCASE_MAPS[i];
  const full = map.prompt;

  // Per example: type the sentence, reveal the plan, hold, then move on.
  React.useEffect(() => {
    if (reduce) {
      // Static end-state: full sentence + finished plan, no typing or cycling.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTyped(full);
      setMapped(true);
      return;
    }
    setTyped("");
    setMapped(false);
    const timers: number[] = [];
    let ch = 0;
    const typeNext = () => {
      ch += 1;
      setTyped(full.slice(0, ch));
      if (ch < full.length) timers.push(window.setTimeout(typeNext, 46 + Math.random() * 44));
      else timers.push(window.setTimeout(() => setMapped(true), 480));
    };
    timers.push(window.setTimeout(typeNext, 520));
    timers.push(window.setTimeout(() => setI((p) => (p + 1) % SHOWCASE_MAPS.length), 9200));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [i, reduce, full]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 text-center">
      <h1 className="animate-fade-up font-display text-[2.4rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-[4rem]">
        Say what you want.<br className="hidden sm:block" /> See the whole path.
      </h1>
      <p className="animate-fade-up mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "0.1s" }}>
        Type your goal in plain words. Solaspace lays out every step and puts the right video or guide on each one.
      </p>

      {/* The "say it" box. It demonstrates by typing; tapping it starts YOUR goal
          over in onboarding (which requires an account before Sola generates). */}
      <Link
        href="/onboarding"
        aria-label="Start with your own goal"
        className="chrome animate-fade-up group mt-8 flex w-full max-w-xl items-center gap-3 rounded-2xl py-2 pl-4 pr-2 text-left transition-transform hover:-translate-y-0.5"
        style={{ animationDelay: "0.2s" }}
      >
        <Pencil size={16} className="shrink-0 text-faint" />
        <span className="min-w-0 flex-1 truncate text-[16px] text-ink sm:text-[17px]">
          {typed || <span className="text-faint">What do you want to do?</span>}
          {!reduce && (
            <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-pulse-soft rounded-full bg-accent align-middle" aria-hidden />
          )}
        </span>
        <span className="raised-gold inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-[14px] font-semibold">
          Start yours <ArrowRight size={15} />
        </span>
      </Link>
      <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Free to start · no card needed</p>

      {/* The "see it" payoff: the plan for the goal just typed, drawing itself. */}
      <div className="relative mt-3 min-h-[300px] w-full sm:mt-5 sm:min-h-[340px]">
        <div className="grid-veil pointer-events-none absolute inset-0 -z-10 opacity-25" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[440px] w-[440px] max-w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: `${map.color}12`, transition: "background 1s ease" }}
        />
        {mapped && (
          <div key={i} className="animate-fade-in">
            <ShowcaseTree map={map} />
          </div>
        )}
      </div>

      {/* which example is playing */}
      <div className="mt-5 flex items-center justify-center gap-2" aria-hidden>
        {SHOWCASE_MAPS.map((m, idx) => (
          <button
            key={m.id}
            onClick={() => setI(idx)}
            aria-label={`Show the ${m.short} example`}
            className="grid place-items-center p-1"
          >
            <span
              className="block h-1.5 rounded-full transition-all duration-300"
              style={{ width: idx === i ? 22 : 6, background: idx === i ? m.color : "color-mix(in srgb, var(--color-ink) 20%, transparent)" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
