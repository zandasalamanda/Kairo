import { cn } from "@/lib/utils";

export function KairoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
      // Soft contact shadow so the orb is seated on cream; near-invisible on dark.
      style={{ filter: "drop-shadow(var(--mark-drop))" }}
    >
      <defs>
        <radialGradient id="km-core" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#fdf3e0" />
          <stop offset="46%" stopColor="#e6b877" />
          <stop offset="100%" stopColor="#7c5c30" />
        </radialGradient>
      </defs>
      {/* orbit — theme-aware (white on dark, warm-dark arc on cream) */}
      <path
        d="M16 3.5a12.5 12.5 0 1 1 -9.4 20.7"
        style={{ stroke: "var(--mark-orbit)" }}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* node on orbit — theme-aware */}
      <circle cx="6.6" cy="24.2" r="2" style={{ fill: "var(--mark-node)" }} />
      {/* glowing core + hairline rim so it never dissolves into white */}
      <circle cx="16" cy="15" r="6.2" fill="url(#km-core)" style={{ stroke: "var(--mark-rim)" }} strokeWidth="0.75" />
      {/* specular highlight keeps the glossy-orb read on light */}
      <ellipse cx="13.8" cy="12.6" rx="1.8" ry="1.2" fill="#ffffff" opacity="0.5" />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
  size = 28,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <KairoMark size={size} />
      {showWordmark && (
        <span className="font-display text-[19px] font-semibold tracking-tight text-ink">Solaspace</span>
      )}
    </span>
  );
}
