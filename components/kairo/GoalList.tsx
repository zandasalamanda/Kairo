"use client";

import * as React from "react";
import { ChevronDown, Waypoints, Check } from "lucide-react";
import type { GoalWithNodes, GoalNode } from "@/types";
import { useGoalColors } from "@/lib/kairo/use-goal-colors";
import { goalIcon } from "@/lib/kairo/goal-icon";
import { nextNodeForGoal } from "@/lib/kairo/next-move";
import { cn, formatDuration } from "@/lib/utils";

// The linear alternate to the galaxy — a fast, scannable outline of every goal
// and its steps (research's "one spatial view for delight, one list for scale").
// Read-only + jump-to-galaxy; the galaxy and Today cockpit are the action surfaces.
export function GoalList({ goals, onOpen }: { goals: GoalWithNodes[]; onOpen: (id: string) => void }) {
  const color = useGoalColors();
  const active = goals.filter((g) => g.status === "active");
  if (active.length === 0) {
    return <div className="grid h-full place-items-center px-6 text-center text-[14px] text-muted">No goals yet — switch to Map to map your first one.</div>;
  }
  return (
    <div className="mx-auto max-w-2xl space-y-3 px-5 pb-28 pt-[calc(72px+env(safe-area-inset-top))]">
      {active.map((g) => <GoalRow key={g.id} goal={g} hex={color(g.id)} onOpen={() => onOpen(g.id)} />)}
    </div>
  );
}

function GoalRow({ goal, hex, onOpen }: { goal: GoalWithNodes; hex: string; onOpen: () => void }) {
  const [open, setOpen] = React.useState(true);
  const next = nextNodeForGoal(goal);
  const milestones = goal.nodes.filter((n) => !n.parentId);
  const kids = (id: string) => goal.nodes.filter((n) => n.parentId === id);

  return (
    <div className="panel rounded-2xl p-1.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${hex}1f` }}>
          {React.createElement(goalIcon(goal.icon), { size: 17, style: { color: hex } })}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-ink">{goal.title}</span>
          <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(3, Math.round(goal.progress))}%`, background: hex }} />
          </span>
        </span>
        <span className="shrink-0 font-mono text-[11px] text-faint">{Math.round(goal.progress)}%</span>
        <ChevronDown size={16} className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-1.5 pb-1.5">
          {milestones.map((m) => (
            <div key={m.id}>
              <NodeRow node={m} hex={hex} isNext={next?.id === m.id} onOpen={onOpen} />
              {kids(m.id).map((c) => <NodeRow key={c.id} node={c} hex={hex} isNext={next?.id === c.id} onOpen={onOpen} sub />)}
            </div>
          ))}
          <button onClick={onOpen} className="mt-1.5 ml-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-muted transition-colors hover:text-ink">
            <Waypoints size={13} /> Open in map
          </button>
        </div>
      )}
    </div>
  );
}

function NodeRow({ node, hex, isNext, onOpen, sub }: { node: GoalNode; hex: string; isNext: boolean; onOpen: () => void; sub?: boolean }) {
  const done = node.status === "done";
  return (
    <button onClick={onOpen} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.03]", sub && "pl-9")}>
      <span
        className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full", !done && "border border-line")}
        style={done ? { background: hex } : isNext ? { boxShadow: `0 0 0 2px ${hex}66` } : undefined}
      >
        {done && <Check size={11} className="text-canvas" />}
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-[14px]", done ? "text-faint line-through" : isNext ? "font-medium text-ink" : "text-muted")}>{node.title}</span>
      {isNext && <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">next</span>}
      <span className="shrink-0 font-mono text-[11px] text-faint">{formatDuration(node.estimatedMinutes)}</span>
    </button>
  );
}
