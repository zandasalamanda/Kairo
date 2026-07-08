"use client";

import * as React from "react";
import type { ShowcaseMap } from "@/lib/kairo/showcase-maps";
import { PlanetOrb } from "./PlanetOrb";
import { truncate } from "@/lib/utils";

// A mini goal-map that mirrors the real galaxy: glossy planet nodes, curved
// connectors, an embossed core icon, and a draw-in "building" animation.

const W = 680, H = 300;

interface N { x: number; y: number; r: number }

/** Curved connector between two nodes, offset so it starts/ends at their rims. */
function curve(a: N, b: N): string {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const sx = a.x + (dx / d) * a.r, sy = a.y + (dy / d) * a.r;
  const ex = b.x - (dx / d) * b.r, ey = b.y - (dy / d) * b.r;
  const mx = (sx + ex) / 2 + dy * 0.09, my = (sy + ey) / 2 - dx * 0.09;
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

export function ShowcaseMiniMap({ map }: { map: ShowcaseMap }) {
  const hex = map.color;
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const core: N = { x: 72, y: 150, r: 28 };
  const ms = map.milestones;
  const milestones: (N & { title: string; i: number })[] = ms.map((m, i) => ({
    x: 200 + i * 128,
    y: 150 + Math.sin(i * 1.25 + 0.4) * 18,
    r: 15,
    title: m.title,
    i,
  }));
  const subs: (N & { mi: number; j: number })[] = [];
  ms.forEach((m, i) => {
    const base = milestones[i];
    m.subs.forEach((_, j) => {
      const side = (i + j) % 2 === 0 ? -1 : 1;
      subs.push({ x: base.x + 12, y: base.y + side * (46 + j * 12), r: 8, mi: i, j });
    });
  });

  // spine + rib connectors, in build order (core outward)
  const spineLinks = milestones.map((m, i) => ({ a: i === 0 ? core : milestones[i - 1], b: m, delay: 0.15 + i * 0.16 }));
  const ribLinks = subs.map((s) => ({ a: milestones[s.mi], b: s, delay: 0.3 + s.mi * 0.16 + s.j * 0.06 }));

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const gid = `planet-${map.id}`;

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id={gid} cx="0.38" cy="0.3" r="0.75">
            <stop offset="0%" stopColor="#fdf3e0" />
            <stop offset="42%" stopColor={hex} />
            <stop offset="100%" stopColor="#14110a" />
          </radialGradient>
        </defs>

        {/* connectors — draw in from the core outward */}
        {[...spineLinks, ...ribLinks].map((l, i) => (
          <path
            key={i}
            d={curve(l.a, l.b)}
            fill="none"
            stroke={hex}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeOpacity={0.6}
            style={{ strokeDasharray: 420, strokeDashoffset: on ? 0 : 420, transition: `stroke-dashoffset 0.5s ease ${l.delay}s` }}
          />
        ))}

        {/* sub-step orbs (unlabeled, like real leaf nodes) */}
        {subs.map((s, i) => (
          <g key={i} style={{ filter: `drop-shadow(0 0 5px ${hex}66)`, opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(0.3)", transformOrigin: `${s.x}px ${s.y}px`, transition: `opacity .4s ease ${0.42 + s.mi * 0.16}s, transform .5s cubic-bezier(0.34,1.56,0.64,1) ${0.42 + s.mi * 0.16}s` }}>
            <circle cx={s.x} cy={s.y} r={s.r} fill={`url(#${gid})`} stroke={hex} strokeOpacity={0.6} strokeWidth={0.8} />
            <circle cx={s.x - s.r * 0.28} cy={s.y - s.r * 0.32} r={s.r * 0.3} fill="#fff" fillOpacity={0.55} />
          </g>
        ))}

        {/* milestone planets + labels */}
        {milestones.map((m) => (
          <g key={m.i} style={{ opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(0.3)", transformOrigin: `${m.x}px ${m.y}px`, transition: `opacity .45s ease ${0.28 + m.i * 0.16}s, transform .55s cubic-bezier(0.34,1.56,0.64,1) ${0.28 + m.i * 0.16}s` }}>
            <g style={{ filter: `drop-shadow(0 0 8px ${hex}77)` }}>
              <circle cx={m.x} cy={m.y} r={m.r} fill={`url(#${gid})`} stroke={hex} strokeOpacity={0.7} strokeWidth={1} />
              <circle cx={m.x - m.r * 0.3} cy={m.y - m.r * 0.34} r={m.r * 0.32} fill="#fff" fillOpacity={0.6} />
            </g>
            <text x={m.x} y={m.y - m.r - 9} textAnchor="middle" fill="#f2f3f5" fontSize="12.5" fontWeight={600} style={{ fontFamily: "var(--font-sans)", paintOrder: "stroke", stroke: "#0a0b0d", strokeWidth: 3, strokeLinejoin: "round" }}>
              {truncate(m.title, 22)}
            </text>
          </g>
        ))}
      </svg>

      {/* the goal core — a real glossy planet with the embossed icon */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pct(core.x, W), top: pct(core.y, H), opacity: on ? 1 : 0, transform: `translate(-50%,-50%) scale(${on ? 1 : 0.4})`, transition: "opacity .5s ease, transform .55s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <PlanetOrb hex={hex} size={64} icon={map.icon} seed={map.id} />
      </div>
    </div>
  );
}
