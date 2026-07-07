"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";
import { useGoalColors } from "@/lib/kairo/use-goal-colors";
import type { NextMove } from "@/lib/kairo/next-move";

export function BottomNav({ nextMove, className }: { nextMove: NextMove | null; className?: string }) {
  const pathname = usePathname();
  const onMap = pathname === "/app/map";
  const goalColor = useGoalColors();
  const moveHex = nextMove ? goalColor(nextMove.goalId) : "#e6b877";
  return (
    <div className={cn("fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2", className)}>
      <div className="mx-auto max-w-md space-y-1.5">
        {nextMove && !onMap && (
          <Link
            href={`/app/map?goal=${nextMove.goalId}`}
            className="flex items-center gap-2 rounded-2xl border bg-canvas-2/85 px-4 py-2.5 backdrop-blur-xl"
            style={{ borderColor: `${moveHex}40` }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: moveHex, boxShadow: `0 0 8px ${moveHex}` }} />
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: moveHex }}>Next</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{nextMove.title}</span>
            <ArrowRight size={14} className="shrink-0 text-faint" />
          </Link>
        )}
        <nav className="flex items-center justify-around rounded-2xl border border-line bg-canvas-2/85 p-1.5 backdrop-blur-xl">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-ink" : "text-muted"
                )}
              >
                <Icon size={19} strokeWidth={2} className={active ? "text-accent" : ""} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
