"use client";

import * as React from "react";
import { goalIcon } from "@/lib/kairo/goal-icon";

// A goal orb with a node that flies around it on a TILTED 3D orbit (real CSS 3D,
// so it passes behind the orb on the far side and in front on the near side,
// growing and shrinking with perspective), trailing a gold comet tail as it
// goes. The core is a glossy goal orb whose centre cross-fades through goal-type
// icons, in white like the rest of the app.

const ICON_KEYS = ["target", "fitness", "money", "language", "travel", "rocket", "writing", "music"];
const SIZE = 176;
const R = 54; // orbit radius

// The comet: a bright head plus a few fading, shrinking gold dots strung out
// behind it along the orbit.
const COMET = [
  { deg: 0, s: 17, o: 1, glow: true },
  { deg: -8, s: 14, o: 0.6, glow: false },
  { deg: -17, s: 11, o: 0.38, glow: false },
  { deg: -27, s: 9, o: 0.22, glow: false },
  { deg: -38, s: 7, o: 0.12, glow: false },
  { deg: -50, s: 5, o: 0.06, glow: false },
];

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

  const cell: React.CSSProperties = { gridArea: "1 / 1" };

  return (
    <div aria-hidden className={className} style={{ perspective: "600px" }}>
      <div style={{ display: "grid", placeItems: "center", width: SIZE, height: SIZE, transformStyle: "preserve-3d" }}>
        {/* soft glow */}
        <div style={{ ...cell, width: SIZE * 0.82, height: SIZE * 0.82, borderRadius: "50%", transform: "translateZ(-8px)", background: "radial-gradient(circle, rgba(230,184,119,0.2), transparent 68%)" }} />

        {/* tilted orbit plane, spinning, carrying the comet through real depth */}
        <div style={{ ...cell, width: SIZE, height: SIZE, transformStyle: "preserve-3d", transform: "rotateX(66deg)" }}>
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", animation: reduce ? undefined : "orbit 11s linear infinite" }}>
            {COMET.map((c, k) => (
              <div key={k} style={{ position: "absolute", left: "50%", top: "50%", transformStyle: "preserve-3d", transform: `rotateZ(${c.deg}deg)` }}>
                <span
                  style={{
                    position: "absolute", left: 0, top: 0, width: c.s, height: c.s, marginLeft: -c.s / 2, marginTop: -c.s / 2,
                    borderRadius: "50%", transform: `translateX(${R}px)`,
                    background: "radial-gradient(circle at 38% 32%, #fff6e6, #e6b877 58%, #a9803f)",
                    boxShadow: c.glow ? "0 0 12px rgba(230,184,119,0.7)" : undefined,
                    opacity: c.o,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* the central goal orb — faces you at z 0, so it hides the comet on the back pass.
            Shaded like a real sphere: bright specular near the top-left, gold body, dark
            edge, with an inner shadow on the far side and an inner highlight on the lit side. */}
        <div style={{ ...cell, transformStyle: "preserve-3d" }}>
          <div
            className="relative grid place-items-center rounded-full"
            style={{
              width: 72, height: 72,
              background: "radial-gradient(circle at 33% 27%, #fff7e8 0%, #f2d79f 20%, #e6b877 50%, #bb8949 76%, #6d4e27 100%)",
              boxShadow:
                "inset -7px -9px 18px rgba(74,50,18,0.6), inset 5px 6px 12px rgba(255,255,255,0.55), 0 7px 20px -4px rgba(70,46,16,0.5), 0 0 34px rgba(230,184,119,0.26)",
              animation: reduce ? undefined : "breathe 7s ease-in-out infinite",
            }}
          >
            {/* specular highlight */}
            <span
              className="pointer-events-none absolute rounded-full"
              style={{ width: 22, height: 15, left: "22%", top: "18%", background: "radial-gradient(circle, rgba(255,255,255,0.85), rgba(255,255,255,0) 68%)" }}
            />
            {React.createElement(goalIcon(ICON_KEYS[ic]), {
              key: ic,
              size: 27,
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
