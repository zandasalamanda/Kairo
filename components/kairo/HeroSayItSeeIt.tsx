"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SHOWCASE_MAPS } from "@/lib/kairo/showcase-maps";
import { PENDING_KEY } from "./OnboardingFlow";
import { ShowcaseTree } from "./ShowcaseTree";

// The landing hero. Type a goal right here and it hands off the SAME way the
// onboarding screen does: stash the goal, send you to sign up, and Sola maps it
// the moment you're back. It never calls the AI itself — nothing is generated,
// and no tokens spent, until there's an account. Below the fold, a real example
// plan draws itself and cross-fades between goals (it stays mounted, so it never
// blinks out on a flip).

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
  const router = useRouter();
  const reduce = usePrefersReducedMotion();
  const [goal, setGoal] = React.useState("");
  const [i, setI] = React.useState(0);
  const [visible, setVisible] = React.useState(true);
  const first = React.useRef(true);
  const map = SHOWCASE_MAPS[i];

  // Cycle the example plan.
  React.useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setI((p) => (p + 1) % SHOWCASE_MAPS.length), 6000);
    return () => window.clearInterval(id);
  }, [reduce]);

  // Cross-fade on change. The tree stays mounted the whole time — it fades out,
  // the map swaps, it fades back in. It never unmounts, so it never disappears.
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    setVisible(false);
    const t = window.setTimeout(() => setVisible(true), 260);
    return () => window.clearTimeout(t);
  }, [i]);

  const start = () => {
    const g = goal.trim();
    if (g) {
      try { window.sessionStorage.setItem(PENDING_KEY, g); } catch { /* private mode */ }
    }
    router.push("/sign-up");
  };

  return (
    <>
      {/* First screen: quiet and roomy — one promise, one box, nothing else. */}
      <div className="flex min-h-[86svh] flex-col items-center justify-center px-5 pb-10 pt-24 text-center">
        <h1 className="animate-fade-up font-display text-[2.5rem] font-semibold leading-[1.06] tracking-tight text-ink sm:text-6xl md:text-[4.1rem]">
          Are you ready to{" "}
          <span className="relative whitespace-nowrap text-accent">
            get things done
            <span aria-hidden className="absolute inset-x-0 -bottom-1 h-[0.09em] rounded-full bg-gradient-to-r from-accent/30 via-accent to-accent/30" />
          </span>
          ?
        </h1>
        <p className="animate-fade-up mx-auto mt-7 max-w-xl text-balance text-[16px] leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "0.1s" }}>
          Type any goal in plain words. Sola maps every step and finds every resource, so you always know exactly what to do next.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); start(); }}
          className="chrome animate-fade-up mt-10 flex w-full max-w-xl items-center gap-2 rounded-2xl py-2 pl-4 pr-2"
          style={{ animationDelay: "0.2s" }}
        >
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={`e.g. ${map.prompt}`}
            aria-label="Your goal"
            enterKeyHint="go"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-faint focus:outline-none sm:text-[17px]"
          />
          <button type="submit" className="raised-gold inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-[14px] font-semibold sm:px-5">
            Get started <ArrowRight size={15} />
          </button>
        </form>
        <p className="animate-fade-up mt-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint" style={{ animationDelay: "0.28s" }}>
          Free to start · no card needed
        </p>

        <a href="#see" className="mt-16 text-faint transition-colors hover:text-muted" aria-label="See it in action">
          <ChevronDown size={22} className="animate-pulse-soft" />
        </a>
      </div>

      {/* Just below the fold: the payoff, a real plan drawing itself. */}
      <div id="see" className="mx-auto max-w-3xl px-5 pb-4 pt-6">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-faint">Watch it map a real goal</p>
        <div className="relative mt-6 min-h-[300px] sm:min-h-[360px]">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[440px] w-[440px] max-w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: `${map.color}12`, transition: "background 1s ease" }}
          />
          <div style={{ opacity: visible ? 1 : 0, transition: "opacity .26s ease" }}>
            <ShowcaseTree map={map} />
          </div>
        </div>
      </div>
    </>
  );
}
