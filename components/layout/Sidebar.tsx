"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, ArrowUpRight } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { NAV } from "./nav";
import { Logo } from "@/components/kairo/Logo";
import { cn } from "@/lib/utils";
import { clerkPublic } from "@/lib/config";
import { useGoalColors } from "@/lib/kairo/use-goal-colors";
import type { SessionUser } from "@/lib/auth";
import type { NextMove } from "@/lib/kairo/next-move";

export function Sidebar({ user, nextMove, usage, className }: { user: SessionUser; nextMove: NextMove | null; usage?: { dayUsed: number; dayLimit: number } | null; className?: string }) {
  const pathname = usePathname();
  const goalColor = useGoalColors();
  const moveHex = nextMove ? goalColor(nextMove.goalId) : "#e6b877";
  const usePct = usage ? Math.min(100, Math.round((usage.dayUsed / Math.max(1, usage.dayLimit)) * 100)) : 0;
  const useOver = !!usage && usage.dayUsed >= usage.dayLimit;
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-[248px] flex-col justify-between border-r border-line bg-canvas-2/70 px-4 py-6 backdrop-blur-xl",
        className
      )}
    >
      <div>
        <Link href="/app/today" className="mb-9 flex px-2">
          <Logo />
        </Link>
        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "raised-btn text-ink" : "text-muted hover:text-ink hover:bg-white/[0.03]"
                )}
              >
                <Icon size={17} strokeWidth={2} className={cn("shrink-0 transition-colors", active ? "text-accent" : "text-faint group-hover:text-muted")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {nextMove && (
          <Link
            href={`/app/map?goal=${nextMove.goalId}`}
            className="mt-7 block rounded-xl border px-3.5 py-3 transition-colors"
            style={{ borderColor: `${moveHex}40`, background: `${moveHex}12` }}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: moveHex, boxShadow: `0 0 8px ${moveHex}` }} />
              <span className="text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: moveHex }}>Next move</span>
            </div>
            <p className="mt-1.5 truncate text-[13.5px] font-medium text-ink">{nextMove.title}</p>
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {user.plan === "free" && usage && (
          <div className="rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono uppercase tracking-[0.14em] text-faint">Daily AI</span>
              <span className={cn("font-mono", useOver ? "text-warn" : "text-muted")}>{usage.dayUsed}/{usage.dayLimit}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full border border-black/40 bg-black/30">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${usePct}%`, background: useOver ? "linear-gradient(180deg,#f0a36a,#d9784a)" : "linear-gradient(180deg,#f3d6a0,#e6b877)" }}
              />
            </div>
            {useOver && <p className="mt-1.5 text-[11px] leading-snug text-faint">You&apos;ve used today&apos;s free AI. It resets tomorrow — or go Pro.</p>}
          </div>
        )}
        {user.plan === "free" && (
          <Link
            href="/app/billing"
            className="group block rounded-xl border border-line bg-white/[0.02] p-4 transition-colors hover:border-line-strong"
          >
            <div className="flex items-center gap-1.5 text-sm font-semibold text-accent">
              Upgrade to Pro <ArrowUpRight size={14} className="opacity-70" />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">Unlimited goals, deeper AI planning, and forecasting.</p>
          </Link>
        )}
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          {clerkPublic ? (
            <UserButton appearance={{ elements: { userButtonAvatarBox: "h-9 w-9" } }} />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/[0.06] text-[13px] font-semibold text-ink">
              {user.initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-ink">{user.name}</div>
            <div className="text-[11px] capitalize text-faint">{user.plan} plan</div>
          </div>
          <Link href="/app/settings" className="text-faint transition-colors hover:text-ink" aria-label="Settings">
            <Settings size={16} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
