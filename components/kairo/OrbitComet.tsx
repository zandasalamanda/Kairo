"use client";

import * as React from "react";

// The comet's tail, drawn as strokes ON the actual orbit ellipse, so it follows
// the curve exactly (a stroke is one continuous line — it can never look like
// separate orbs). Several stroked copies of the same path, each a dash of a
// different length sharing the same leading edge, taper the fade: near the head
// they all overlap (bright), further back only the long faint ones remain. The
// dash is moved around the path with stroke-dashoffset (measured path length, so
// it stays glued to the head that rides the same ellipse via offset-path).

export const ELLIPSE_D = "M 174 108 A 66 40 0 1 1 42 108 A 66 40 0 1 1 174 108";
const PERIOD = 11000;
const LAYERS = [
  { L: 13, o: 0.5, w: 5 },
  { L: 21, o: 0.38, w: 4.4 },
  { L: 31, o: 0.27, w: 3.8 },
  { L: 44, o: 0.17, w: 3.1 },
  { L: 60, o: 0.09, w: 2.4 },
  { L: 78, o: 0.04, w: 1.9 },
];

export function OrbitComet() {
  const refs = React.useRef<(SVGPathElement | null)[]>([]);

  React.useEffect(() => {
    const first = refs.current[0];
    if (!first) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const P = first.getTotalLength();
    const anims: Animation[] = [];
    LAYERS.forEach((ly, i) => {
      const el = refs.current[i];
      if (!el) return;
      el.setAttribute("stroke-dasharray", `${ly.L} ${P}`);
      if (reduce) {
        el.style.strokeDashoffset = String(ly.L - 0.08 * P); // park it near the start
        return;
      }
      // dashoffset L -> L-P slides the dash once forward around the loop; its
      // leading edge is always at the head's path position.
      anims.push(
        el.animate([{ strokeDashoffset: ly.L }, { strokeDashoffset: ly.L - P }], {
          duration: PERIOD,
          iterations: Infinity,
          easing: "linear",
        })
      );
    });
    return () => anims.forEach((a) => a.cancel());
  }, []);

  return (
    <svg viewBox="0 0 216 216" className="absolute inset-0 h-full w-full" style={{ overflow: "visible" }} aria-hidden>
      {LAYERS.map((ly, i) => (
        <path
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          d={ELLIPSE_D}
          fill="none"
          stroke="#e9bd80"
          strokeWidth={ly.w}
          strokeLinecap="round"
          opacity={ly.o}
        />
      ))}
    </svg>
  );
}
