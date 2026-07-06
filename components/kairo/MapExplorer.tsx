"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Ban, Play, Wand2, CalendarPlus, Plus } from "lucide-react";
import type { GoalWithNodes, GoalNode, NodeStatus } from "@/types";
import { nodeStatusMeta } from "@/lib/kairo/status";
import { LivingGoalMap } from "./LivingGoalMap";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { cn, formatDuration, makeId, relativeDays } from "@/lib/utils";

function nextId(nodes: GoalNode[]): string | null {
  return (
    nodes.find((n) => n.status === "in_motion")?.id ??
    nodes.find((n) => n.status === "at_risk")?.id ??
    nodes.find((n) => n.status === "not_started")?.id ??
    nodes[0]?.id ??
    null
  );
}

function recompute(progresses: number[]): number {
  if (!progresses.length) return 0;
  return Math.round(progresses.reduce((s, p) => s + p, 0) / progresses.length);
}

export function MapExplorer({ initialGoals, initialGoalId }: { initialGoals: GoalWithNodes[]; initialGoalId?: string }) {
  const [goals, setGoals] = React.useState(initialGoals);
  const [goalId, setGoalId] = React.useState(initialGoalId && initialGoals.some((g) => g.id === initialGoalId) ? initialGoalId : initialGoals[0]?.id);
  const goal = goals.find((g) => g.id === goalId) ?? goals[0];
  const [selectedId, setSelectedId] = React.useState<string | null>(goal ? nextId(goal.nodes) : null);
  const [sentToToday, setSentToToday] = React.useState<string | null>(null);

  const selected = goal?.nodes.find((n) => n.id === selectedId) ?? null;

  const patchNode = (nodeId: string, patch: Partial<GoalNode>) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goal.id) return g;
        const nodes = g.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n));
        return { ...g, nodes, progress: recompute(nodes.map((n) => n.progress)) };
      })
    );
  };

  const setStatus = (nodeId: string, status: NodeStatus) => {
    const patch: Partial<GoalNode> = { status };
    if (status === "done") patch.progress = 100;
    else if (status === "not_started") patch.progress = 0;
    patchNode(nodeId, patch);
  };

  const addStep = () => {
    const node: GoalNode = {
      id: makeId("node"),
      goalId: goal.id,
      parentId: null,
      title: "New step",
      description: "",
      status: "not_started",
      progress: 0,
      priority: 3,
      estimatedMinutes: 45,
      dueDate: null,
      positionX: null,
      positionY: null,
      aiReason: "Added to the map",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, nodes: [...g.nodes, node] } : g)));
    setSelectedId(node.id);
  };

  if (!goal) return null;
  const meta = selected ? nodeStatusMeta[selected.status] : null;

  return (
    <div>
      {/* goal switcher */}
      {goals.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setGoalId(g.id);
                setSelectedId(nextId(g.nodes));
                setSentToToday(null);
              }}
              className={cn(
                "rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all",
                g.id === goalId ? "border-accent/40 bg-accent/10 text-ink" : "border-line text-muted hover:text-ink hover:bg-white/[0.03]"
              )}
            >
              {g.title}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        {/* map */}
        <div className="panel relative overflow-hidden rounded-3xl p-2 sm:p-4">
          <div className="pointer-events-none absolute inset-0 grid-veil opacity-40" />
          <LivingGoalMap goal={goal} selectedId={selectedId} onSelect={(n) => { setSelectedId(n.id); setSentToToday(null); }} className="relative max-h-[62vh]" />
        </div>

        {/* detail panel */}
        <div className="panel h-fit rounded-3xl p-5">
          {selected && meta ? (
            <>
              <div className="mb-1 flex items-center justify-between gap-2">
                <StatusBadge meta={meta} />
                <span className="font-mono text-[11px] text-faint">P{selected.priority} · {formatDuration(selected.estimatedMinutes)}</span>
              </div>
              <h2 className="mt-2 font-display text-xl font-semibold text-ink">{selected.title}</h2>
              {selected.description && <p className="mt-1.5 text-sm text-muted">{selected.description}</p>}

              <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-3">
                <div className="font-mono text-[10px] uppercase tracking-wide text-faint">Next action</div>
                <p className="mt-1 text-[13px] text-ink/90">Spend 25 min to {selected.title.toLowerCase()}.</p>
                {selected.dueDate && <p className="mt-1.5 text-[12px] text-warn">Due {relativeDays(selected.dueDate)}</p>}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button size="sm" variant="glass" onClick={() => setStatus(selected.id, "done")} className="justify-start">
                  <Check size={14} className="text-sage" /> Mark done
                </Button>
                <Button size="sm" variant="glass" onClick={() => setStatus(selected.id, "in_motion")} className="justify-start">
                  <Play size={14} className="text-accent" /> In motion
                </Button>
                <Button size="sm" variant="glass" onClick={() => setStatus(selected.id, "blocked")} className="justify-start">
                  <Ban size={14} className="text-warn" /> Blocked
                </Button>
                <Button size="sm" variant="glass" onClick={() => patchNode(selected.id, { aiReason: "Generated next action" })} className="justify-start">
                  <Wand2 size={14} className="text-accent" /> Next step
                </Button>
              </div>

              <button
                onClick={() => setSentToToday(selected.id)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent/10"
              >
                <CalendarPlus size={14} /> Send to Today
              </button>
              {sentToToday === selected.id && (
                <p className="mt-2 text-center text-[12px] text-sage">
                  Added to Today ·{" "}
                  <Link href="/app/today" className="underline underline-offset-2">open</Link>
                </p>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted">Tap a node to see its next action.</p>
          )}

          <button
            onClick={addStep}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Plus size={14} /> Add step
          </button>
        </div>
      </div>
    </div>
  );
}
