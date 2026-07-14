"use client";

import * as React from "react";
import type { ShowcaseMap } from "@/lib/kairo/showcase-maps";
import { PlanetOrb } from "./PlanetOrb";
import { truncate } from "@/lib/utils";

// A static, faithful rendering of the real in-app goal map: the same fishbone
// layout + collision relaxation the live map uses, so the starter-map preview
// looks exactly like /app/map — a goal core with a branching tree of milestones
// and sub-steps, curved connectors, glowing orbs, drawn in on open.

const SPINE_RAD = 200, LEAF_RAD = 150, SPINE_ARC = 0.11;
const M_R = 21, S_R = 13, CORE_R = 40;

type LNode = { id: string; parentId: string | null; title: string; sub: boolean };
interface Placed { node: LNode; x: number; y: number; px: number; py: number; spine: boolean }

function layout(nodes: LNode[]): Placed[] {
  const ids = new Set(nodes.map((n) => n.id));
  const kids = new Map<string | null, LNode[]>();
  for (const n of nodes) {
    const p = n.parentId && ids.has(n.parentId) ? n.parentId : null;
    (kids.get(p) ?? kids.set(p, []).get(p)!).push(n);
  }
  const hasKids = (id: string) => (kids.get(id)?.length ?? 0) > 0;
  const out: Placed[] = [];
  const place = (parentId: string | null, cx: number, cy: number, dir: number) => {
    const children = kids.get(parentId) ?? [];
    const leaves = children.filter((c) => !hasKids(c.id));
    const spineKids = children.filter((c) => hasKids(c.id));
    leaves.forEach((leaf, i) => {
      const side = i % 2 === 0 ? 1 : -1, rank = Math.floor(i / 2);
      const angle = dir + side * (Math.PI / 2 - 0.08) + side * rank * 0.32;
      const rad = LEAF_RAD + rank * 54;
      out.push({ node: leaf, x: cx + Math.cos(angle) * rad, y: cy + Math.sin(angle) * rad, px: cx, py: cy, spine: false });
    });
    spineKids.forEach((cont, i) => {
      const fan = spineKids.length > 1 ? (i - (spineKids.length - 1) / 2) * 0.6 : 0;
      const angle = dir + SPINE_ARC + fan;
      const x = cx + Math.cos(angle) * SPINE_RAD, y = cy + Math.sin(angle) * SPINE_RAD;
      out.push({ node: cont, x, y, px: cx, py: cy, spine: true });
      place(cont.id, x, y, angle);
    });
  };
  const roots = kids.get(null) ?? [];
  roots.forEach((root) => {
    // Flow the spine rightward (and gently arcing) so the tree is a wide roadmap
    // that fits a popup, rather than the tall vertical the in-app map opens as.
    const spine = hasKids(root.id), rad = spine ? SPINE_RAD : LEAF_RAD, dir = -0.32;
    const x = Math.cos(dir) * rad, y = Math.sin(dir) * rad;
    out.push({ node: root, x, y, px: 0, py: 0, spine });
    if (spine) place(root.id, x, y, dir);
  });
  return relax(out);
}

function relax(placed: Placed[]): Placed[] {
  if (placed.length < 2) return placed;
  const pts = placed.map((p) => ({ ...p }));
  const idx = new Map<string, number>();
  pts.forEach((p, i) => idx.set(p.node.id, i));
  const MIN_SPINE = 138, MIN_LEAF = 104, CORE_CLEAR = 150;
  for (let iter = 0; iter < 90; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], min = a.spine || b.spine ? MIN_SPINE : MIN_LEAF;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
      if (d < min) { const push = (min - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; moved = true; }
    }
    for (const p of pts) { const d = Math.hypot(p.x, p.y) || 0.001; if (d < CORE_CLEAR) { const push = CORE_CLEAR - d; p.x += (p.x / d) * push; p.y += (p.y / d) * push; moved = true; } }
    if (!moved) break;
  }
  for (const p of pts) { const pi = p.node.parentId ? idx.get(p.node.parentId) : undefined; if (pi !== undefined) { p.px = pts[pi].x; p.py = pts[pi].y; } else { p.px = 0; p.py = 0; } }
  return pts;
}

/** Curved connector from a to b, trimmed to each node's rim. */
function curve(ax: number, ay: number, ar: number, bx: number, by: number, br: number) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
  const sx = ax + (dx / d) * ar, sy = ay + (dy / d) * ar;
  const ex = bx - (dx / d) * br, ey = by - (dy / d) * br;
  const mx = (sx + ex) / 2 + dy * 0.09, my = (sy + ey) / 2 - dx * 0.09;
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

export function ShowcaseTree({ map }: { map: ShowcaseMap }) {
  const hex = map.color;
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id); }, []);

  const { placed, vb, core } = React.useMemo(() => {
    const nodes: LNode[] = [];
    map.milestones.slice(0, 5).forEach((m, i) => {
      nodes.push({ id: `m${i}`, parentId: i > 0 ? `m${i - 1}` : null, title: m.title, sub: false });
      m.subs.slice(0, 3).forEach((s, j) => nodes.push({ id: `m${i}s${j}`, parentId: `m${i}`, title: s, sub: true }));
    });
    const p = layout(nodes);
    // bounding box including the core at (0,0) and room for labels
    const PAD = 118;
    const xs = [0, ...p.map((n) => n.x)], ys = [0, ...p.map((n) => n.y)];
    const minx = Math.min(...xs) - PAD, maxx = Math.max(...xs) + PAD;
    const miny = Math.min(...ys) - PAD, maxy = Math.max(...ys) + PAD;
    return { placed: p, vb: { x: minx, y: miny, w: maxx - minx, h: maxy - miny }, core: { x: 0, y: 0 } };
  }, [map]);

  const gid = `st-${map.id}`;
  const corePctX = ((core.x - vb.x) / vb.w) * 100;
  const corePctY = ((core.y - vb.y) / vb.h) * 100;

  return (
    <div className="relative w-full" style={{ aspectRatio: `${vb.w} / ${vb.h}` }}>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label={`${map.title} map`}>
        <defs>
          <radialGradient id={gid} cx="0.4" cy="0.32" r="0.85">
            <stop offset="0%" stopColor="#2b3140" />
            <stop offset="70%" stopColor="#161a22" />
            <stop offset="100%" stopColor="#10131a" />
          </radialGradient>
        </defs>

        {/* connectors — draw in from the core outward */}
        {placed.map((n, i) => (
          <path
            key={`c${i}`}
            d={curve(n.px, n.py, n.px === 0 && n.py === 0 ? CORE_R : M_R, n.x, n.y, n.node.sub ? S_R : M_R)}
            fill="none" stroke={hex} strokeWidth={n.spine ? 1.7 : 1.2} strokeLinecap="round" strokeOpacity={n.spine ? 0.5 : 0.32}
            style={{ strokeDasharray: 700, strokeDashoffset: on ? 0 : 700, transition: `stroke-dashoffset 0.6s ease ${0.2 + i * 0.05}s` }}
          />
        ))}

        {/* node orbs + labels */}
        {placed.map((n, i) => {
          const r = n.node.sub ? S_R : M_R;
          const isNext = n.node.id === "m0";
          const delay = 0.3 + i * 0.05;
          return (
            <g key={`n${i}`} style={{ opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(0.3)", transformOrigin: `${n.x}px ${n.y}px`, transition: `opacity .4s ease ${delay}s, transform .5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s` }}>
              {isNext && <circle cx={n.x} cy={n.y} r={r + 7} fill="none" stroke={hex} strokeOpacity={0.55} strokeWidth={1.5} className="lt-pulse" style={{ transformOrigin: `${n.x}px ${n.y}px` }} />}
              <circle cx={n.x} cy={n.y} r={r} fill={`url(#${gid})`} stroke={hex} strokeOpacity={isNext ? 0.85 : 0.42} strokeWidth={1} style={{ filter: isNext ? `drop-shadow(0 0 11px ${hex}aa)` : `drop-shadow(0 0 6px ${hex}44)` }} />
              <circle cx={n.x} cy={n.y - r * 0.28} r={r * 0.5} fill={hex} fillOpacity={0.16} />
              <text x={n.x} y={n.y + r + (n.node.sub ? 15 : 19)} textAnchor="middle" fill={n.node.sub ? "#c7cbd3" : "#f2f3f5"} fontSize={n.node.sub ? 13.5 : 16} fontWeight={n.node.sub ? 400 : 600}
                style={{ fontFamily: "var(--font-sans)", paintOrder: "stroke", stroke: "#0a0b0d", strokeWidth: 4, strokeLinejoin: "round" }}>
                {truncate(n.node.title, n.node.sub ? 22 : 20)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* the goal core — a real glossy planet with the embossed icon, like the app */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${corePctX}%`, top: `${corePctY}%`, opacity: on ? 1 : 0, transform: `translate(-50%,-50%) scale(${on ? 1 : 0.4})`, transition: "opacity .5s ease, transform .6s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <PlanetOrb hex={hex} size={CORE_R * 2} icon={map.icon} seed={map.id} />
      </div>
    </div>
  );
}
