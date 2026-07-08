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
    >
      <defs>
        <radialGradient id="km-core" cx="50%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#fbeccf" />
          <stop offset="48%" stopColor="#e6b877" />
          <stop offset="100%" stopColor="#8a6a3c" />
        </radialGradient>
      </defs>
      {/* orbit */}
      <path
        d="M16 3.5a12.5 12.5 0 1 1 -9.4 20.7"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* node on orbit */}
      <circle cx="6.6" cy="24.2" r="2" fill="#e6b877" />
      {/* glowing core */}
      <circle cx="16" cy="15" r="6.2" fill="url(#km-core)" />
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
