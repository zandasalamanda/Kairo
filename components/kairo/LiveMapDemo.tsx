"use client";

import * as React from "react";
import Link from "next/link";
import { SHOWCASE_MAPS } from "@/lib/kairo/showcase-maps";
import { PlanetOrb } from "./PlanetOrb";
import { ShowcaseTree } from "./ShowcaseTree";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

// The landing's "show, don't tell" moment: a real goal map that draws itself, then
// cycles to the next sample — so a visitor sees the product working before they lift
// a finger. Reuses the exact ShowcaseTree the app renders (self-framing, self-
// centring); re-keying it replays the build animation each cycle.
export function LiveMapDemo() {
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setI((p) => (p + 1) % SHOWCASE_MAPS.length), 5600);
    return () => window.clearInterval(id);
  }, []);

  const map = SHOWCASE_MAPS[i];

  return (
    <div className="panel-2 relative overflow-hidden rounded-[28px] p-6 md:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: `${map.color}1f`, transition: "background 1s ease" }} />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Watch a goal become a plan</span>
        <div className="flex items-center gap-2.5">
          <PlanetOrb hex={map.color} size={26} icon={map.icon} seed={map.id} />
          <h3 className="font-display text-xl font-semibold text-ink transition-colors md:text-2xl">{map.title}</h3>
        </div>
      </div>

      <div className="relative mt-4 min-h-[300px]">
        <ShowcaseTree map={map} />
      </div>

      {/* the sample selector — dots that also let a visitor jump to a plan */}
      <div className="relative mt-4 flex items-center justify-center gap-2">
        {SHOWCASE_MAPS.map((m, idx) => (
          <button
            key={m.id}
            onClick={() => setI(idx)}
            aria-label={`Show ${m.short} plan`}
            className="grid place-items-center p-1"
          >
            <span
              className="block h-1.5 rounded-full transition-all duration-300"
              style={{ width: idx === i ? 22 : 6, background: idx === i ? m.color : "rgba(255,255,255,0.18)" }}
            />
          </button>
        ))}
      </div>

      <div className="relative mt-5 flex justify-center">
        <Link href="/onboarding">
          <Button variant="primary" size="lg">Map your goal <ArrowRight size={16} /></Button>
        </Link>
      </div>
    </div>
  );
}
