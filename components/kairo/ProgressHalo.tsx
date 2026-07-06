import * as React from "react";
import { cn } from "@/lib/utils";
import { clampPct } from "@/lib/utils";

export function ProgressHalo({
  progress,
  size = 44,
  stroke = 3,
  hex = "#e6b877",
  track = true,
  className,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  hex?: string;
  track?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clampPct(progress) / 100);
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        {track && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 4px ${hex}88)`, transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      {children != null && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
