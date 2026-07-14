"use client";

import * as React from "react";
import { Check } from "lucide-react";

// A small, self-contained "win" flourish: a glowing medallion that grows in with a
// burst ring sweeping out behind it — the same grammar the map uses on a completed
// node. Reused by Today, focus completion, and whole-goal completion. Motion is all
// CSS tokens, so prefers-reduced-motion disables it automatically.
export function Celebration({
  hex = "#e6b877",
  size = 64,
  icon,
  className,
}: {
  hex?: string;
  size?: number;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} style={{ position: "relative", display: "grid", placeItems: "center", width: size, height: size }}>
      <span className="absolute inset-0 animate-burst rounded-full" style={{ border: `2px solid ${hex}` }} aria-hidden />
      <span
        className="grid animate-grow-in place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 50% 35%, ${hex}33, transparent 72%)`,
          boxShadow: `0 0 0 2px rgba(255,240,210,0.85), 0 0 26px ${hex}aa`,
        }}
      >
        {icon ?? <Check size={Math.round(size * 0.4)} className="text-ink" strokeWidth={2.5} />}
      </span>
    </div>
  );
}
