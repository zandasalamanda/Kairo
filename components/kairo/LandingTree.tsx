"use client";

import * as React from "react";
import type { ShowcaseMap } from "@/lib/kairo/showcase-maps";
import { PlanetOrb } from "./PlanetOrb";
import { truncate } from "@/lib/utils";

// The signature living map, built for the landing: a goal core at the top, then a
// gently winding spine of milestones flowing down, each sprouting a sub-step or two.
// Deterministic, non-overlapping, and drawn in on mount so it feels alive.

interface Pt { x: number; y: number }
const W = 480;
const TOP = 92;          // core center y
const STEP = 150;        // vertical gap between milestones
const AMP = 34;          // serpentine amplitude of the spine
const M_R = 19;          // milestone orb radius
const S_R = 10;          // sub orb radius

function build(map: ShowcaseMap) {
  const ms = map.milestones.slice(0, 5);
  const core: Pt = { x: W / 2, y: TOP };
  const miles = ms.map((m, i) => ({
    ...m,
    x: W / 2 + Math.sin(i * 1.15 + 0.5) * AMP,
    y: TOP + 96 + i * STEP,
    i,
  }));
  // Subs branch to the side with more room (away from the label, which sits opposite).
  const subs: { x: number; y: number; title: string; side: number; mi: number }[] = [];
  miles.forEach((m) => {
    const side = m.x <= W / 2 ? 1 : -1; // sprout toward the roomier side
    m.subs.slice(0, 2).forEach((title, k) => {
      subs.push({ x: m.x + side * (72 + k * 4), y: m.y + (k === 0 ? -30 : 34), title, side, mi: m.i });
    });
  });
  const height = TOP + 96 + (miles.length - 1) * STEP + 120;
  return { core, miles, subs, height };
}

/** Curved connector from a to b, trimmed to each node's rim. */
function link(a: Pt, ar: number, b: Pt, br: number) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  const sx = a.x + (dx / d) * ar, sy = a.y + (dy / d) * ar;
  const ex = b.x - (dx / d) * br, ey = b.y - (dy / d) * br;
  const mx = (sx + ex) / 2 + dy * 0.12, my = (sy + ey) / 2 - dx * 0.12;
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

export function LandingTree({ map }: { map: ShowcaseMap }) {
  const hex = map.color;
  // The parent keys this component by map.id, so a switch remounts it and the
  // draw-in replays from scratch — no need to reset state inside the effect.
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { core, miles, subs, height } = React.useMemo(() => build(map), [map]);
  const H = height;
  const gid = `lt-${map.id}`;
  const pct = (v: number, t: number) => `${(v / t) * 100}%`;

  const spineLinks = miles.map((m, i) => ({ a: i === 0 ? core : miles[i - 1], ar: i === 0 ? 40 : M_R, b: m, delay: 0.25 + i * 0.18 }));
  const ribLinks = subs.map((s) => ({ a: miles[s.mi], b: s, delay: 0.45 + s.mi * 0.18 }));

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label={`${map.title} plan`}>
        <defs>
          <radialGradient id={gid} cx="0.36" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#fdf3e0" />
            <stop offset="44%" stopColor={hex} />
            <stop offset="100%" stopColor="#12100b" />
          </radialGradient>
        </defs>

        {/* connectors draw in from the core downward */}
        {[...spineLinks, ...ribLinks].map((l, i) => (
          <path
            key={i}
            d={link(l.a, "ar" in l ? (l as { ar: number }).ar : M_R, l.b, l.b === core ? 40 : "title" in l.b ? S_R : M_R)}
            fill="none"
            stroke={hex}
            strokeWidth={"ar" in l ? 1.9 : 1.3}
            strokeLinecap="round"
            strokeOpacity={"ar" in l ? 0.62 : 0.4}
            style={{ strokeDasharray: 640, strokeDashoffset: on ? 0 : 640, transition: `stroke-dashoffset 0.55s ease ${l.delay}s` }}
          />
        ))}

        {/* sub-step orbs + labels */}
        {subs.map((s, i) => {
          const anchor = s.side === 1 ? "start" : "end";
          const lx = s.x + s.side * (S_R + 8);
          const delay = 0.55 + s.mi * 0.18;
          return (
            <g key={i} style={{ opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(0.2)", transformOrigin: `${s.x}px ${s.y}px`, transition: `opacity .4s ease ${delay}s, transform .5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s` }}>
              <circle cx={s.x} cy={s.y} r={S_R} fill={`url(#${gid})`} stroke={hex} strokeOpacity={0.5} strokeWidth={0.8} style={{ filter: `drop-shadow(0 0 4px ${hex}55)` }} />
              <circle cx={s.x - S_R * 0.3} cy={s.y - S_R * 0.34} r={S_R * 0.3} fill="#fff" fillOpacity={0.5} />
              <text x={lx} y={s.y + 4} textAnchor={anchor} fill="#c7cbd3" fontSize="13" style={{ fontFamily: "var(--font-sans)", paintOrder: "stroke", stroke: "#0a0b0d", strokeWidth: 3.5, strokeLinejoin: "round" }}>
                {truncate(s.title, 24)}
              </text>
            </g>
          );
        })}

        {/* milestone orbs + labels */}
        {miles.map((m) => {
          const labelSide = m.subs.slice(0, 2).length > 0 && (m.x <= W / 2 ? 1 : -1) === 1 ? -1 : 1; // opposite the sprouts
          const lx = m.x + labelSide * (M_R + 12);
          const anchor = labelSide === 1 ? "start" : "end";
          const delay = 0.38 + m.i * 0.18;
          const isNext = m.i === 0;
          return (
            <g key={m.i} style={{ opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(0.25)", transformOrigin: `${m.x}px ${m.y}px`, transition: `opacity .45s ease ${delay}s, transform .55s cubic-bezier(0.34,1.56,0.64,1) ${delay}s` }}>
              {isNext && <circle cx={m.x} cy={m.y} r={M_R + 7} fill="none" stroke={hex} strokeOpacity={0.5} strokeWidth={1.4} className="lt-pulse" style={{ transformOrigin: `${m.x}px ${m.y}px` }} />}
              <circle cx={m.x} cy={m.y} r={M_R} fill={`url(#${gid})`} stroke={hex} strokeOpacity={isNext ? 0.9 : 0.5} strokeWidth={1} style={{ filter: isNext ? `drop-shadow(0 0 12px ${hex}99)` : `drop-shadow(0 0 5px ${hex}44)` }} />
              <circle cx={m.x - M_R * 0.32} cy={m.y - M_R * 0.36} r={M_R * 0.32} fill="#fff" fillOpacity={0.55} />
              <text x={lx} y={m.y + 5} textAnchor={anchor} fill="#f2f3f5" fontSize="16.5" fontWeight={600} style={{ fontFamily: "var(--font-sans)", paintOrder: "stroke", stroke: "#0a0b0d", strokeWidth: 4, strokeLinejoin: "round" }}>
                {truncate(m.title, 22)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* the goal core — a real glossy planet with the embossed icon */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: pct(core.x, W), top: pct(core.y, H), opacity: on ? 1 : 0, transform: `translate(-50%,-50%) scale(${on ? 1 : 0.4})`, transition: "opacity .5s ease, transform .6s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <PlanetOrb hex={hex} size={78} icon={map.icon} seed={map.id} />
      </div>
    </div>
  );
}
