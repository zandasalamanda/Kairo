"use client";

import * as React from "react";

// A calm activity stream shown while Solaspace maps a goal — narrates the work
// it's actually doing (decompose → sequence → size → resource → pace), so the
// wait reads as "it's doing it for me" rather than a blank spinner.
const STEPS = [
  "Breaking it into milestones",
  "Sequencing what depends on what",
  "Sizing each step",
  "Finding real resources",
  "Setting your pace",
  "Drawing your map",
];

export function MappingNarration() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), 1100);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span key={i} className="animate-fade-in mt-1 block font-mono text-[11px] uppercase tracking-[0.2em] text-accent/70">
      {STEPS[i]}
    </span>
  );
}
