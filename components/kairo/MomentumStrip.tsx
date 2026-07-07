"use client";

import * as React from "react";
import { Flame, Clock, Timer } from "lucide-react";
import type { FocusStats, GoalWithNodes } from "@/types";
import { useGoalColors } from "@/lib/kairo/use-goal-colors";
import { goalIcon } from "@/lib/kairo/goal-icon";
import { SectionLabel } from "./PageHeader";

function hm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** Momentum + where the focus time went — the payoff of finishing focus sessions. */
export function MomentumStrip({ stats, goals }: { stats: FocusStats; goals: GoalWithNodes[] }) {
  const color = useGoalColors();
  const goalById = React.useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const maxMinutes = Math.max(1, ...stats.perGoal.map((p) => p.minutes));
  const cold = stats.totalSessions === 0;

  return (
    <div>
      <SectionLabel>Momentum</SectionLabel>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Tile
          icon={<Flame size={15} className={stats.streakDays > 0 ? "text-accent" : "text-faint"} />}
          value={String(stats.streakDays)}
          unit={stats.streakDays === 1 ? "day" : "days"}
          label="Focus streak"
          lit={stats.streakDays > 0}
        />
        <Tile icon={<Clock size={15} className="text-muted" />} value={hm(stats.weekMinutes)} label="This week" sub={`${stats.weekSessions} session${stats.weekSessions === 1 ? "" : "s"}`} />
        <Tile icon={<Timer size={15} className="text-muted" />} value={hm(stats.totalMinutes)} label="All time" sub={`${stats.totalSessions} session${stats.totalSessions === 1 ? "" : "s"}`} />
      </div>

      {stats.perGoal.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {stats.perGoal.slice(0, 5).map((p) => {
            const g = goalById.get(p.goalId);
            if (!g) return null;
            const hex = color(g.id);
            const Icon = goalIcon(g.icon);
            return (
              <div key={p.goalId} className="flex items-center gap-3">
                <Icon size={15} className="shrink-0" style={{ color: hex }} />
                <span className="w-28 shrink-0 truncate text-[13px] text-ink/90">{g.title}</span>
                <div className="inset-well h-2 flex-1 overflow-hidden rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(6, (p.minutes / maxMinutes) * 100)}%`, background: hex }} />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-[12px] text-muted">{hm(p.minutes)}</span>
              </div>
            );
          })}
        </div>
      )}

      {cold && (
        <p className="mt-3 text-[13px] text-faint">
          Finish a focus session on any step and your streak and focus time show up here.
        </p>
      )}
    </div>
  );
}

function Tile({ icon, value, unit, label, sub, lit }: { icon: React.ReactNode; value: string; unit?: string; label: string; sub?: string; lit?: boolean }) {
  return (
    <div className="panel rounded-2xl p-3.5">
      <div className="flex items-center gap-1.5">{icon}<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span></div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`font-display text-2xl font-bold tabular-nums ${lit ? "text-accent" : "text-ink"}`}>{value}</span>
        {unit && <span className="text-[12px] text-faint">{unit}</span>}
      </div>
      {sub && <span className="mt-0.5 block text-[11px] text-faint">{sub}</span>}
    </div>
  );
}
