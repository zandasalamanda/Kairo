"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, ArrowUpRight } from "lucide-react";
import { NAV } from "./nav";
import { Logo } from "@/components/kairo/Logo";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

export function Sidebar({ user, className }: { user: SessionUser; className?: string }) {
  const pathname = usePathname();
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
                  active ? "bg-white/[0.05] text-ink" : "text-muted hover:text-ink hover:bg-white/[0.03]"
                )}
              >
                <Icon size={17} strokeWidth={2} className={cn("shrink-0 transition-colors", active ? "text-accent" : "text-faint group-hover:text-muted")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3">
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
          <div className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/[0.06] text-[13px] font-semibold text-ink">
            {user.initials}
          </div>
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
