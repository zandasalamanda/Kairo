"use client";

import * as React from "react";
import type { ShowcaseMap } from "@/lib/kairo/showcase-maps";
import { PlanetOrb } from "./PlanetOrb";
import { cn, truncate } from "@/lib/utils";

// A static rendering of the real in-app goal map, drawn EXACTLY as the live map
// draws it: the same fishbone layout + collision relaxation, DOM node orbs and an
// SVG connector layer sharing one coordinate space, connector offsets matching the
// real orb radii, and the whole tree scaled as a single unit to fit the popup — so
// orbs and lines stay connected and proportional at any size (no oversized core).

const SPINE_RAD = 168, LEAF_RAD = 128, SPINE_ARC = 0.11;

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
      const rad = LEAF_RAD + rank * 46;
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
    // Flow the spine rightward, gently arcing, so the tree reads as a wide roadmap.
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
  const MIN_SPINE = 122, MIN_LEAF = 92, CORE_CLEAR = 128;
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

export function ShowcaseTree({ map }: { map: ShowcaseMap }) {
  const hex = map.color;
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [cw, setCw] = React.useState(0);
  const [on, setOn] = React.useState(false);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => setCw(e[0].contentRect.width));
    ro.observe(el);
    const id = requestAnimationFrame(() => setOn(true));
    return () => { ro.disconnect(); cancelAnimationFrame(id); };
  }, []);

  const { placed, minX, minY, W0, H0, maxDist } = React.useMemo(() => {
    const nodes: LNode[] = [];
    map.milestones.slice(0, 5).forEach((m, i) => {
      nodes.push({ id: `m${i}`, parentId: i > 0 ? `m${i - 1}` : null, title: m.title, sub: false });
      m.subs.slice(0, 2).forEach((s, j) => nodes.push({ id: `m${i}s${j}`, parentId: `m${i}`, title: s, sub: true }));
    });
    const p = layout(nodes);
    // Frame the ACTUAL visual content (orb radii + the labels below each orb), not
    // the node centers, so the tree sits perfectly centered instead of up-and-left.
    const CORE_R = 46, MARGIN = 12, LABEL_HALF = 62, LABEL_DROP = 26;
    let minx = -CORE_R, maxx = CORE_R, miny = -CORE_R, maxy = CORE_R; // the core at (0,0)
    for (const n of p) {
      const r = n.spine ? 25 : 19;
      minx = Math.min(minx, n.x - Math.max(r, LABEL_HALF));
      maxx = Math.max(maxx, n.x + Math.max(r, LABEL_HALF));
      miny = Math.min(miny, n.y - r);
      maxy = Math.max(maxy, n.y + r + LABEL_DROP); // labels hang below each orb
    }
    minx -= MARGIN; maxx += MARGIN; miny -= MARGIN; maxy += MARGIN;
    const md = Math.max(1, ...p.map((n) => Math.hypot(n.x, n.y)));
    return { placed: p, minX: minx, minY: miny, W0: maxx - minx, H0: maxy - miny, maxDist: md };
  }, [map]);

  const MAXH = 420;
  const s = cw > 0 ? Math.min(cw / W0, MAXH / H0) : 0;

  return (
    <div ref={wrapRef} className="w-full">
      <div className="relative mx-auto" style={{ width: W0 * s, height: H0 * s }}>
        <div className="absolute left-0 top-0" style={{ transform: `translate(${-minX * s}px, ${-minY * s}px) scale(${s})`, transformOrigin: "0 0" }}>
          {/* connectors — same math and offsets as the live map, so lines meet the orbs */}
          <svg width={1} height={1} className="absolute left-0 top-0" style={{ overflow: "visible" }} aria-hidden>
            {placed.map((p) => {
              const isNext = p.node.id === "m0";
              const CORE_R = p.px === 0 && p.py === 0 ? 44 : 22;
              const NODE_R = p.spine ? 23 : 17;
              const dx = p.x - p.px, dy = p.y - p.py, d = Math.hypot(dx, dy) || 1;
              const sx = p.px + (dx / d) * CORE_R, sy = p.py + (dy / d) * CORE_R;
              const ex = p.x - (dx / d) * NODE_R, ey = p.y - (dy / d) * NODE_R;
              const mx = (sx + ex) / 2 + dy * 0.08, my = (sy + ey) / 2 - dx * 0.08;
              const len = Math.hypot(ex - sx, ey - sy) * 1.15 + 4;
              const delay = (Math.hypot(p.x, p.y) / maxDist) * 0.55;
              return (
                <path
                  key={p.node.id}
                  d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`}
                  fill="none" stroke={hex} strokeWidth={isNext ? 1.9 : p.spine ? 1.6 : 1.0} strokeLinecap="round"
                  strokeDasharray={isNext ? "3 7" : len}
                  className={isNext ? "animate-flow" : undefined}
                  style={isNext ? { opacity: 0.85 } : { strokeDashoffset: on ? 0 : len, transition: `stroke-dashoffset 0.5s ease ${delay.toFixed(2)}s`, opacity: 0.5 }}
                />
              );
            })}
          </svg>

          {/* node orbs — exactly the app's NodeOrb styling (spine 50px, leaf 38px) */}
          {placed.map((p) => {
            const isNext = p.node.id === "m0";
            const size = p.spine ? 50 : 38;
            const glow = isNext ? `0 0 26px ${hex}80` : `0 0 13px ${hex}3a`;
            const bg = `radial-gradient(circle at 40% 34%, ${hex}33, rgba(12,14,18,0.94) 72%)`;
            const delay = (Math.hypot(p.x, p.y) / maxDist) * 0.55 + 0.16;
            return (
              <div
                key={p.node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: p.x, top: p.y, opacity: on ? 1 : 0, transform: `translate(-50%,-50%) scale(${on ? 1 : 0.4})`, transition: `opacity .4s ease ${delay.toFixed(2)}s, transform .5s cubic-bezier(0.34,1.56,0.64,1) ${delay.toFixed(2)}s` }}
              >
                <div className="relative grid place-items-center" style={{ width: size, height: size }}>
                  {isNext && <span className="absolute inset-0 animate-pulse-soft rounded-full" style={{ boxShadow: `0 0 0 4px ${hex}22, 0 0 24px ${hex}66`, margin: -4 }} />}
                  <span className="grid place-items-center rounded-full border" style={{ width: size, height: size, borderColor: isNext ? hex : `${hex}88`, background: bg, boxShadow: glow, opacity: isNext ? 1 : 0.94 }}>
                    <span className="rounded-full" style={{ width: p.spine ? 9 : 7, height: p.spine ? 9 : 7, background: hex, boxShadow: `0 0 8px ${hex}` }} />
                  </span>
                  <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-[120px] -translate-x-1/2 text-center leading-tight">
                    <span className={cn("block truncate", p.spine ? "text-[13px] font-semibold text-ink" : "text-[11px] text-muted")} style={{ textShadow: "0 1px 10px rgba(8,9,11,0.96), 0 0 4px rgba(8,9,11,0.9)" }}>
                      {truncate(p.node.title, p.spine ? 20 : 24)}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}

          {/* the goal core — the real glossy planet, at (0,0), scaling with everything else */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: 0, top: 0, opacity: on ? 1 : 0, transform: `translate(-50%,-50%) scale(${on ? 1 : 0.5})`, transition: "opacity .5s ease, transform .6s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <PlanetOrb hex={hex} size={92} icon={map.icon} seed={map.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
