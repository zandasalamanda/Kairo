"use client";

import * as React from "react";
import { goalIcon } from "@/lib/kairo/goal-icon";
import type { ShowcaseMap } from "@/lib/kairo/showcase-maps";

// A prettied, animated fishbone of one showcase map — spine of milestones with
// ribs to sub-steps, drawn in the map's color, echoing the real galaxy map.

export function ShowcaseMiniMap({ map }: { map: ShowcaseMap }) {
  const hex = map.color;
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const W = 680, H = 300;
  const coreX = 78, coreY = H / 2;
  const ms = map.milestones;
  const step = (W - 150) / ms.length;
  const nodes = ms.map((m, i) => ({ x: coreX + 46 + step * (i + 0.5), y: coreY + Math.sin(i * 1.2 + 0.4) * 30, m, i }));
  const spineD = `M ${coreX} ${coreY} ` + nodes.map((n) => `L ${n.x.toFixed(1)} ${n.y.toFixed(1)}`).join(" ");
  const ribs = nodes.flatMap((n) =>
    n.m.subs.map((s, j) => {
      const side = j % 2 === 0 ? -1 : 1;
      const rx = n.x + 20;
      const ry = n.y + side * (40 + j * 10);
      return { x1: n.x, y1: n.y, x2: rx, y2: ry, label: s, delay: 0.55 + n.i * 0.18 + j * 0.08 };
    })
  );

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${hex}22` }}>
          {React.createElement(goalIcon(map.icon), { size: 21, style: { color: hex } })}
        </span>
        <div className="min-w-0">
          <div className="truncate font-display text-lg font-semibold text-ink">{map.title}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Starter map · {ms.length} milestones</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 340, filter: `drop-shadow(0 0 10px ${hex}33)` }}>
        {/* spine */}
        <path
          d={spineD}
          fill="none"
          stroke={hex}
          strokeOpacity={0.55}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 1800, strokeDashoffset: on ? 0 : 1800, transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
        />
        {/* ribs + sub-step dots */}
        {ribs.map((r, i) => (
          <g key={i} style={{ opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${r.delay}s` }}>
            <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={hex} strokeOpacity={0.32} strokeWidth={1.4} strokeLinecap="round" />
            <circle cx={r.x2} cy={r.y2} r={3.4} fill={hex} fillOpacity={0.85} />
            <text x={r.x2 + 8} y={r.y2 + 3.5} fill="#9a9ea8" fontSize="10.5" style={{ fontFamily: "var(--font-sans)" }}>{r.label}</text>
          </g>
        ))}
        {/* goal core */}
        <circle cx={coreX} cy={coreY} r={24} fill={hex} fillOpacity={0.9} />
        <circle cx={coreX} cy={coreY} r={24} fill="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={1} />
        <circle cx={coreX - 7} cy={coreY - 8} r={7} fill="#ffffff" fillOpacity={0.35} />
        {/* milestone nodes + labels */}
        {nodes.map((n, i) => (
          <g key={i} style={{ opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(0.4)", transformOrigin: `${n.x}px ${n.y}px`, transition: `opacity 0.45s ease ${0.3 + i * 0.2}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.3 + i * 0.2}s` }}>
            <circle cx={n.x} cy={n.y} r={7.5} fill={hex} />
            <circle cx={n.x} cy={n.y} r={3} fill="#fffaf0" fillOpacity={0.95} />
            <text x={n.x} y={n.y - 15} textAnchor="middle" fill="#f2f3f5" fontSize="12.5" fontWeight={500} style={{ fontFamily: "var(--font-sans)" }}>{n.m.title}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
