"use client";

import Link from "next/link";
import { SectionLabel } from "./PageHeader";
import { cn } from "@/lib/utils";

interface Props {
  plan: "free" | "pro";
  dayUsed: number;
  dayLimit: number;
  monthUsed: number;
  monthLimit: number;
  proDay: number;
  proMonth: number;
}

export function UsageMeter({ plan, dayUsed, dayLimit, monthUsed, monthLimit, proDay, proMonth }: Props) {
  const over = dayUsed >= dayLimit;
  const pct = Math.min(100, Math.round((dayUsed / Math.max(1, dayLimit)) * 100));

  return (
    <div className="panel rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>AI usage</SectionLabel>
        <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{plan} plan</span>
      </div>

      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted">Today</span>
        <span className={cn("font-mono", over ? "text-warn" : "text-ink")}>{dayUsed} / {dayLimit}</span>
      </div>

      {/* glossy meter */}
      <div className="inset-well mt-1.5 h-2.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: over ? "linear-gradient(180deg,#f0a36a,#d9784a)" : "linear-gradient(180deg,#f3d6a0,#e6b877)",
            boxShadow: over
              ? "0 0 10px rgba(217,120,74,0.5), inset 0 1px 0 rgba(255,255,255,0.4)"
              : "0 0 10px rgba(230,184,119,0.5), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        />
      </div>

      {plan === "free" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-accent">With Pro</span>
          <span className="text-muted">
            {proDay} / day · {proMonth} / mo · <Link href="/app/billing" className="text-accent hover:underline">upgrade</Link>
          </span>
        </div>
      )}

      <p className={cn("mt-2 text-[12px]", over ? "text-warn" : "text-faint")}>
        {over ? "You've hit today's limit. It resets within a day." : `${dayLimit - dayUsed} left today`} · {monthUsed} / {monthLimit} this month
      </p>
    </div>
  );
}
