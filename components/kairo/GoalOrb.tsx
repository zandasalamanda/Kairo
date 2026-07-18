"use client";

import * as React from "react";
import { goalIcon } from "@/lib/kairo/goal-icon";
import { OrbitComet, ELLIPSE_D } from "./OrbitComet";

// A glossy goal orb that wobbles gently in place, with a planet flying a smooth
// orbit around it. Method (per the usual comet/orbit techniques): both the planet
// and its tail ride a CSS motion path (offset-path + offset-distance), which the
// browser interpolates ALONG the real curve, so the motion is smooth with no
// choppy corners. The tail is ONE tangent-aligned gradient streak (offset-rotate:
// auto) that fades to transparent — a single trail, never a row of separate orbs.
// A stepped z-index carries the planet in front of the core down low and behind it
// up top. The core's centre cross-fades through goal-type icons, in white.

const ICON_KEYS = ["target", "fitness", "money", "language", "travel", "rocket", "writing", "music"];
const SIZE = 216;
const CORE = 92;
const PERIOD = 11; // seconds per orbit
// The head rides the very same ellipse the tail is stroked on, so it sits at the
// tail's leading edge. Starts at the right, sweeps clockwise: bottom (near) then top (far).
const PATH = `path('${ELLIPSE_D}')`;

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

export function GoalOrb({ className }: { className?: string }) {
  const reduce = usePrefersReducedMotion();
  const [ic, setIc] = React.useState(0);

  React.useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setIc((n) => (n + 1) % ICON_KEYS.length), 2600);
    return () => window.clearInterval(id);
  }, [reduce]);

  const move: React.CSSProperties = reduce
    ? { offsetPath: PATH, offsetDistance: "8%" }
    : { offsetPath: PATH, offsetDistance: "0%", animation: `orbit-move ${PERIOD}s linear infinite`, willChange: "offset-distance" };

  return (
    <div aria-hidden className={className}>
      <div className="relative grid place-items-center" style={{ width: SIZE, height: SIZE, isolation: "isolate" }}>
        {/* soft glow */}
        <div className="absolute rounded-full" style={{ width: SIZE * 0.76, height: SIZE * 0.76, background: "radial-gradient(circle, rgba(230,184,119,0.18), transparent 68%)", zIndex: 0 }} />

        {/* the planet + its curve-following trail, stepping behind/in-front of the core */}
        <div className="absolute inset-0" style={{ animation: reduce ? undefined : `comet-depth ${PERIOD}s linear infinite` }}>
          {/* the tail — strokes ON the orbit path, so it follows the curve */}
          <OrbitComet />
          {/* the planet — a round billboard sphere (offset-rotate 0, so it never tilts),
              riding the same ellipse so it sits at the tail's leading edge */}
          <div
            style={{
              ...move,
              offsetRotate: "0deg",
              position: "absolute", top: 0, left: 0, width: 28, height: 28, borderRadius: "50%",
              background: "radial-gradient(circle at 36% 30%, #fff6e6 0%, #f0d49a 34%, #e6b877 62%, #a9803f 100%)",
              boxShadow: "inset 1px 1px 2px rgba(255,255,255,0.6), 0 0 14px rgba(230,184,119,0.6)",
            }}
          />
        </div>

        {/* the central goal orb — a real sphere, wobbling gently in place, at z-index 1 */}
        <div className={reduce ? "relative" : "relative animate-bobble"} style={{ zIndex: 1 }}>
          <div
            className="relative grid place-items-center rounded-full"
            style={{
              width: CORE, height: CORE,
              background: "radial-gradient(circle at 33% 27%, #fff7e8 0%, #f2d79f 20%, #e6b877 50%, #bb8949 76%, #6d4e27 100%)",
              boxShadow:
                "inset -9px -11px 22px rgba(74,50,18,0.6), inset 6px 7px 15px rgba(255,255,255,0.55), 0 8px 24px -5px rgba(70,46,16,0.5), 0 0 40px rgba(230,184,119,0.26)",
            }}
          >
            <span
              className="pointer-events-none absolute rounded-full"
              style={{ width: 28, height: 19, left: "22%", top: "18%", background: "radial-gradient(circle, rgba(255,255,255,0.85), rgba(255,255,255,0) 68%)" }}
            />
            {React.createElement(goalIcon(ICON_KEYS[ic]), {
              key: ic,
              size: 34,
              strokeWidth: 1.7,
              className: "animate-fade-in relative",
              style: { color: "#ffffff", opacity: 0.82, filter: "drop-shadow(0 1px 2px rgba(50,34,8,0.55))" },
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
