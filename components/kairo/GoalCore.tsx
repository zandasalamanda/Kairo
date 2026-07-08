import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The floating goal core — a single luminous orb. Solaspace's signature focal
 * object; one of the few places that carries the accent and a soft glow.
 */
export function GoalCore({
  size = 120,
  hex = "#e6b877",
  pulse = true,
  orbit = true,
  className,
  children,
}: {
  size: number;
  hex?: string;
  pulse?: boolean;
  orbit?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const sphere = Math.round(size * 0.56);
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }} aria-hidden>
      {/* ambient glow */}
      <div
        className={cn("absolute rounded-full blur-2xl", pulse && "animate-pulse-soft")}
        style={{ width: size, height: size, background: `radial-gradient(circle, ${hex}44, transparent 64%)` }}
      />
      {/* orbit rings */}
      {orbit && (
        <>
          <div className="absolute rounded-full border" style={{ width: size * 0.92, height: size * 0.92, borderColor: "rgba(255,255,255,0.08)" }} />
          <div className="absolute rounded-full border" style={{ width: size * 1.12, height: size * 1.12, borderColor: "rgba(255,255,255,0.04)" }} />
        </>
      )}
      {/* sphere */}
      <div
        className="relative grid place-items-center rounded-full"
        style={{
          width: sphere,
          height: sphere,
          background: `radial-gradient(circle at 34% 26%, #fdf3e0 0%, ${hex} 46%, #22190c 100%)`,
          boxShadow: `inset 0 -8px 22px rgba(0,0,0,0.5), inset 0 3px 9px rgba(255,255,255,0.4), 0 0 40px ${hex}44`,
        }}
      >
        <span
          className="absolute rounded-full bg-white/70 blur-[3px]"
          style={{ width: sphere * 0.18, height: sphere * 0.13, top: sphere * 0.16, left: sphere * 0.24 }}
        />
        {children != null && <div className="relative z-10 text-[#1b1206]">{children}</div>}
      </div>
    </div>
  );
}
