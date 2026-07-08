"use client";

import * as React from "react";
import Link from "next/link";
import { Timer, Check, Waypoints, Sunrise } from "lucide-react";
import type { GoalWithNodes, GoalNode, NodeStatus } from "@/types";
import { nextNodeForGoal } from "@/lib/kairo/next-move";
import { goalIcon } from "@/lib/kairo/goal-icon";
import { useGoalColors } from "@/lib/kairo/use-goal-colors";
import { setNodeStatus, logFocusSession, setGoalNotes } from "@/lib/data/actions";
import { FocusOverlay } from "./FocusOverlay";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/utils";

const RANK: Record<string, number> = { at_risk: 0, in_motion: 1, not_started: 2, blocked: 3, done: 4 };

function recompute(nodes: GoalNode[]): number {
  if (nodes.length === 0) return 0;
  return Math.round((nodes.filter((n) => n.status === "done").length / nodes.length) * 100);
}

/** The Cockpit: your real next step in each goal, one tap to run it or finish it. */
export function CockpitView({ goals: initial, remote }: { goals: GoalWithNodes[]; remote: boolean }) {
  const color = useGoalColors();
  const [goals, setGoals] = React.useState(initial);
  const [focus, setFocus] = React.useState<{ goalId: string; node: GoalNode } | null>(null);

  const moves = goals
    .filter((g) => g.status === "active")
    .map((g) => ({ g, node: nextNodeForGoal(g) }))
    .filter((x): x is { g: GoalWithNodes; node: GoalNode } => x.node !== null)
    .sort((a, b) => (RANK[a.node.status] - RANK[b.node.status]) || (a.node.priority - b.node.priority));

  const setStatus = (goalId: string, nodeId: string, status: NodeStatus) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const nodes = g.nodes.map((n) => (n.id === nodeId ? { ...n, status, ...(status === "done" ? { progress: 100 } : {}) } : n));
        return { ...g, nodes, progress: recompute(nodes) };
      })
    );
    if (remote) void setNodeStatus({ goalId, nodeId, status });
  };

  const markDone = (goalId: string, nodeId: string, minutes?: number) => {
    setStatus(goalId, nodeId, "done");
    if (remote && minutes) void logFocusSession({ goalId, nodeId, minutes });
  };

  const startFocus = (goalId: string, node: GoalNode) => {
    if (node.status !== "in_motion") setStatus(goalId, node.id, "in_motion");
    setFocus({ goalId, node });
  };

  const appendNote = (goalId: string, label: string, body: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const notes = (g.notes ? `${g.notes.trim()}\n\n` : "") + `--- ${label} ---\n${body.trim()}\n`;
        if (remote) void setGoalNotes({ goalId, notes });
        return { ...g, notes };
      })
    );
  };

  const hasGoals = goals.some((g) => g.status === "active");
  const focusGoal = focus ? goals.find((g) => g.id === focus.goalId) : null;

  if (moves.length === 0) {
    return (
      <EmptyState
        icon={<Sunrise size={22} />}
        title={hasGoals ? "You're all caught up" : "Nothing on deck yet"}
        description={hasGoals ? "Every goal's open steps are done or waiting. Add a step, or unblock what's stuck on the map." : "Map a goal and your next move in each one shows up here, ready to run."}
        action={<Link href="/app/map"><Button variant="primary" size="lg">{hasGoals ? "Open the map" : "Create a goal"}</Button></Link>}
      />
    );
  }

  return (
    <>
      <p className="mb-5 text-[14px] text-muted">
        {moves.length} move{moves.length === 1 ? "" : "s"} on deck — one per goal that needs you. Pick one and go.
      </p>

      <div className="space-y-3">
        {moves.map(({ g, node }) => {
          const hex = color(g.id);
          const Icon = goalIcon(g.icon);
          const slipping = node.status === "at_risk";
          return (
            <div key={node.id} className="panel rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Icon size={14} className="shrink-0" style={{ color: hex }} />
                <span className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Next in {g.title}</span>
                {slipping && <span className="shrink-0 rounded-full bg-warn/10 px-2 py-0.5 text-[10px] font-medium text-warn">slipping</span>}
                <span className="shrink-0 font-mono text-[11px] text-faint">{formatDuration(node.estimatedMinutes)}</span>
              </div>
              <h3 className="mt-1.5 font-display text-[17px] font-medium leading-snug text-ink">{node.title}</h3>
              {node.description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{node.description}</p>}
              <div className="mt-3.5 flex items-center gap-2">
                <button onClick={() => startFocus(g.id, node)} className="raised-gold inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[14px] font-medium">
                  <Timer size={16} /> Focus
                </button>
                <button onClick={() => markDone(g.id, node.id)} className="raised-btn inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] text-sage">
                  <Check size={15} /> Done
                </button>
                <Link href={`/app/map?goal=${g.id}`} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:text-ink" aria-label="Open in map" title="Open in map">
                  <Waypoints size={15} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {focus && focusGoal && (
        <FocusOverlay
          key={focus.node.id}
          title={focus.node.title}
          goalTitle={focusGoal.title}
          nodeDescription={focus.node.description}
          context={focusGoal.notes.trim() || undefined}
          hex={color(focus.goalId)}
          onComplete={(mins) => { markDone(focus.goalId, focus.node.id, mins); setFocus(null); }}
          onClose={() => setFocus(null)}
          onSaveArtifact={(label, body) => appendNote(focus.goalId, `${label} · ${focus.node.title}`, body)}
        />
      )}
    </>
  );
}
