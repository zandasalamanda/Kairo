import type { GoalWithNodes, GoalNode } from "@/types";

export interface NextMove {
  title: string;
  goalTitle: string;
  goalId: string;
}

// Rank actionable nodes: slipping first, then in-motion, then not-started.
const RANK: Record<string, number> = { at_risk: 0, in_motion: 1, not_started: 2 };

function isOpen(n: GoalNode): boolean {
  return n.status === "at_risk" || n.status === "in_motion" || n.status === "not_started";
}

/** The single next step to work on within one goal (null if nothing's open). */
export function nextNodeForGoal(goal: GoalWithNodes): GoalNode | null {
  const open = goal.nodes.filter(isOpen);
  if (open.length === 0) return null;
  open.sort((a, b) => (RANK[a.status] - RANK[b.status]) || (a.priority - b.priority));
  return open[0];
}

/** The single best thing to do next across every active goal. */
export function computeNextMove(goals: GoalWithNodes[]): NextMove | null {
  const candidates = goals
    .filter((g) => g.status === "active")
    .flatMap((g) => g.nodes.filter(isOpen).map((n) => ({ n, g })));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (RANK[a.n.status] - RANK[b.n.status]) || (a.n.priority - b.n.priority));
  const { n, g } = candidates[0];
  return { title: n.title, goalTitle: g.title, goalId: g.id };
}
