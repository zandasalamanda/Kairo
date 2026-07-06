import { cn } from "@/lib/utils";

/**
 * Ambient depth — a single, static, colorless wash. Deliberately quiet:
 * the atmosphere should be felt, not noticed.
 */
export function OrbBackground({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)} aria-hidden>
      <div className="absolute left-1/2 top-[-20%] h-[55vmax] w-[55vmax] -translate-x-1/2 rounded-full bg-white/[0.03] blur-[130px]" />
    </div>
  );
}
