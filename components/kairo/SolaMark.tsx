import * as React from "react";
import { cn } from "@/lib/utils";

// Sola's mark — a small luminous gold node, not a stock AI "sparkle" and not a
// cartoon. It's the same glossy-orb language as the goal cores, shrunk to an inline
// glyph, so the assistant reads as part of the living map rather than a bolted-on
// chatbot. `thinking` gives it a soft breath while Sola works (reduced-motion-safe
// via the shared pulse-soft token).
export function SolaMark({
  size = 16,
  thinking = false,
  className,
}: {
  size?: number;
  thinking?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block shrink-0 rounded-full align-middle", thinking && "animate-pulse-soft", className)}
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 34% 30%, #fdf3e0 0%, #e6b877 52%, #7c5c30 100%)",
        // Glow on dark (token = gold), transparent on light; plus a hairline rim +
        // soft contact shadow so the bead reads crisply on cream instead of smudging.
        boxShadow: `0 0 ${Math.max(4, Math.round(size * 0.5))}px var(--sola-glow), 0 0 0 0.5px var(--sola-rim), var(--mark-drop)`,
      }}
      aria-hidden
    />
  );
}
