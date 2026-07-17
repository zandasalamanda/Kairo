"use client";

import * as React from "react";
import { SHOWCASE_MAPS } from "@/lib/kairo/showcase-maps";
import { ShowcaseTree } from "./ShowcaseTree";

// A real example plan that draws itself and cross-fades between goals. It stays
// mounted the whole time (fades out, swaps the map, fades back in), so it never
// blinks out on a flip. All canned — no AI, no tokens.
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

export function ExamplePlanDemo() {
  const reduce = usePrefersReducedMotion();
  const [i, setI] = React.useState(0);
  const [visible, setVisible] = React.useState(true);
  const first = React.useRef(true);
  const map = SHOWCASE_MAPS[i];

  React.useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setI((p) => (p + 1) % SHOWCASE_MAPS.length), 6000);
    return () => window.clearInterval(id);
  }, [reduce]);

  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    setVisible(false);
    const t = window.setTimeout(() => setVisible(true), 260);
    return () => window.clearTimeout(t);
  }, [i]);

  return (
    <div className="relative mt-8 min-h-[300px] sm:min-h-[360px]">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[440px] w-[440px] max-w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: `${map.color}12`, transition: "background 1s ease" }}
      />
      <div style={{ opacity: visible ? 1 : 0, transition: "opacity .26s ease" }}>
        <ShowcaseTree map={map} />
      </div>
    </div>
  );
}
