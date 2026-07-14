"use client";

import * as React from "react";
import Link from "next/link";
import { Timer, Check, Waypoints, Sunrise } from "lucide-react";
import type { GoalWithNodes, GoalNode, NodeStatus } from "@/types";
import { nextNodeForGoal } from "@/lib/kairo/next-move";
import { goalIcon } from "@/lib/kairo/goal-icon";
import { useGoalColors } from "@/lib/kairo/use-goal-colors";
import { setNodeStatus, logFocusSession, setGoalNotes } from "@/lib/data/actions";
import { track } from "@/lib/analytics";
import { FocusOverlay } from "./FocusOverlay";
import { Celebration } from "./Celebration";
import { pickCelebration, fireHaptic } from "@/lib/kairo/celebrate";
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
  const [celebration, setCelebration] = React.useState<{ title: string; sub: string; hex: string } | null>(null);
  const celebrateTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (celebrateTimer.current) clearTimeout(celebrateTimer.current); }, []);

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
    // Activation event: a real step finished (created a goal + completed a step).
    track("step_completed", { goalId, surface: "today" });
    if (remote && minutes) void logFocusSession({ goalId, nodeId, minutes });
    // A real step done earns a real beat — the same warm line the map gives, so
    // finishing in Today no longer feels like a silent checkbox flip.
    const line = pickCelebration(nodeId);
    setCelebration({ title: line.title, sub: line.sub, hex: color(goalId) });
    fireHaptic();
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setCelebration(null), 1700);
  };

  const startFocus = (goalId: string, node: GoalNode) => {
    if (node.status !== "in_motion") setStatus(goalId, node.id, "in_motion");
    track("focus_started", { goalId, surface: "today" });
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

  // A momentary reward that floats over whatever's on screen, then fades.
  const celebrationOverlay = celebration ? (
    <div className="pointer-events-none fixed inset-0 z-[135] grid place-items-center px-6">
      <div className="chrome animate-sheet-up flex flex-col items-center rounded-2xl px-8 py-6 text-center">
        <Celebration hex={celebration.hex} size={60} />
        <h3 className="mt-3 font-display text-lg font-semibold text-ink">{celebration.title}</h3>
        <p className="mt-1 max-w-[15rem] text-[13px] leading-relaxed text-muted">{celebration.sub}</p>
      </div>
    </div>
  ) : null;

  if (moves.length === 0) {
    return (
      <>
        {celebrationOverlay}
        {hasGoals ? (
          <div className="grid place-items-center py-16 text-center">
            <Celebration size={72} />
            <h2 className="mt-6 font-display text-2xl font-semibold text-ink">You cleared your day</h2>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
              Every goal&apos;s next move is done. That&apos;s the whole game — one real step at a time.
            </p>
            <Link href="/app/map" className="mt-7"><Button variant="glass" size="lg">Open the map</Button></Link>
          </div>
        ) : (
          <EmptyState
            icon={<Sunrise size={22} />}
            title="Nothing on deck yet"
            description="Map a goal and your next move in each one shows up here, ready to run."
            action={<Link href="/app/map"><Button variant="primary" size="lg">Create a goal</Button></Link>}
          />
        )}
      </>
    );
  }

  const [primary, ...rest] = moves;
  const pHex = color(primary.g.id);
  const pSlipping = primary.node.status === "at_risk";

  return (
    <>
      {celebrationOverlay}
      <p className="mb-5 text-[14px] text-muted">
        The single best thing to do with the time you have today.{rest.length > 0 ? ` ${rest.length} more can wait.` : ""}
      </p>

      {/* The one move — prominent. Everything else is secondary (one-next-move). */}
      <div className="panel-2 relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl" style={{ background: `${pHex}22` }} />
        <div className="relative flex items-center gap-2">
          {React.createElement(goalIcon(primary.g.icon), { size: 15, className: "shrink-0", style: { color: pHex } })}
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Next in {primary.g.title}</span>
          {pSlipping && <span className="shrink-0 rounded-full bg-warn/10 px-2 py-0.5 text-[10px] font-medium text-warn">slipping</span>}
          <span className="shrink-0 font-mono text-[11px] text-faint">{formatDuration(primary.node.estimatedMinutes)}</span>
        </div>
        <h2 className="relative mt-2 font-display text-2xl font-semibold leading-snug text-ink">{primary.node.title}</h2>
        {primary.node.description && <p className="relative mt-1.5 line-clamp-3 text-[14px] leading-relaxed text-muted">{primary.node.description}</p>}
        <div className="relative mt-5 flex items-center gap-2">
          <button onClick={() => startFocus(primary.g.id, primary.node)} className="raised-gold inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[14px] font-medium">
            <Timer size={16} /> Focus
          </button>
          <button onClick={() => markDone(primary.g.id, primary.node.id)} className="raised-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] text-sage">
            <Check size={15} /> Done
          </button>
          <Link href={`/app/map?goal=${primary.g.id}`} className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-faint transition-colors hover:text-ink" aria-label="Open in map" title="Open in map">
            <Waypoints size={15} />
          </Link>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="mt-7">
          <div className="mb-2.5 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Also on deck · {rest.length}</div>
          <div className="space-y-2">
            {rest.map(({ g, node }) => {
              const hex = color(g.id);
              const Icon = goalIcon(g.icon);
              return (
                <div key={node.id} className="panel flex items-center gap-3 rounded-2xl p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${hex}1f` }}><Icon size={15} style={{ color: hex }} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-ink">{node.title}</div>
                    <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{g.title} · {formatDuration(node.estimatedMinutes)}</div>
                  </div>
                  <button onClick={() => startFocus(g.id, node)} className="raised-btn inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-accent" aria-label={`Focus on ${node.title}`}>
                    <Timer size={14} /> Focus
                  </button>
                  <button onClick={() => markDone(g.id, node.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:text-sage" aria-label={`Mark ${node.title} done`} title="Done">
                    <Check size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
