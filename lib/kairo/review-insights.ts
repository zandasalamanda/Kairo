import type { GoalWithNodes } from "@/types";

// The Mirror: what the map can't show you. Pace toward each deadline (are you
// actually going to make it?), steps that have quietly stalled, and goals you've
// stopped touching. All deterministic — computed from goal/node state, no AI.

const DAY = 86_400_000;
const STALL_DAYS = 7;    // an in-motion/blocked step untouched this long is stalled
const NEGLECT_DAYS = 10; // a goal with no activity this long is drifting

export type PaceState = "ahead" | "on" | "behind" | "none" | "done" | "overdue";

export interface PaceInsight {
  goalId: string;
  title: string;
  progress: number;
  /** 0..1 share of the timeline already elapsed (for the marker) */
  timeFraction: number;
  state: PaceState;
  verdict: string;
}
export interface StalledStep {
  goalId: string;
  goalTitle: string;
  nodeTitle: string;
  days: number;
}
export interface NeglectedGoal {
  goalId: string;
  title: string;
  days: number;
}
export interface ReviewInsights {
  headline: string;
  pace: PaceInsight[];
  stalled: StalledStep[];
  neglected: NeglectedGoal[];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** "3 days" / "1 week" / "2 weeks" for a positive day count. */
function humanDays(n: number): string {
  const d = Math.abs(Math.round(n));
  if (d >= 13) return `${Math.round(d / 7)} weeks`;
  if (d >= 6) return `1 week`;
  return `${d} day${d === 1 ? "" : "s"}`;
}

function pace(g: GoalWithNodes, nowMs: number): PaceInsight {
  const base = { goalId: g.id, title: g.title, progress: g.progress };
  if (g.progress >= 100) return { ...base, timeFraction: 1, state: "done", verdict: "Complete" };
  if (!g.targetDate) return { ...base, timeFraction: 0, state: "none", verdict: "No deadline set" };

  const start = Date.parse(g.createdAt);
  const target = Date.parse(g.targetDate);
  if (Number.isNaN(target) || Number.isNaN(start) || target <= start) {
    return { ...base, timeFraction: 0, state: "none", verdict: "No deadline set" };
  }

  const elapsed = nowMs - start;
  const timeFraction = clamp01(elapsed / (target - start));

  if (nowMs >= target) {
    return { ...base, timeFraction: 1, state: "overdue", verdict: `Past deadline — ${Math.round(100 - g.progress)}% still to go` };
  }
  if (g.progress <= 0) {
    return { ...base, timeFraction, state: "behind", verdict: `Not started — ${humanDays((target - nowMs) / DAY)} left` };
  }

  // Project the finish date at the current rate of progress.
  const rate = g.progress / 100 / Math.max(DAY, elapsed); // fraction per ms
  const projectedFinish = nowMs + (1 - g.progress / 100) / rate;
  const lateDays = (projectedFinish - target) / DAY;

  if (lateDays <= -7) return { ...base, timeFraction, state: "ahead", verdict: `Ahead — on track to finish ~${humanDays(lateDays)} early` };
  if (lateDays <= 3) return { ...base, timeFraction, state: "on", verdict: "On track for your deadline" };
  return { ...base, timeFraction, state: "behind", verdict: `Behind — on this pace you finish ~${humanDays(lateDays)} late` };
}

/** Most recent activity on a goal (its own row or any of its nodes). */
function lastTouched(g: GoalWithNodes): number {
  let t = Date.parse(g.updatedAt) || 0;
  for (const n of g.nodes) t = Math.max(t, Date.parse(n.updatedAt) || 0);
  return t;
}

export function computeReviewInsights(goals: GoalWithNodes[], nowMs: number): ReviewInsights {
  const active = goals.filter((g) => g.status === "active");

  // Most urgent first: overdue/behind, then on/ahead, then no-deadline, then done.
  const rank: Record<PaceState, number> = { overdue: 0, behind: 1, on: 2, ahead: 3, none: 4, done: 5 };
  const paceList = active.map((g) => pace(g, nowMs)).sort((a, b) => rank[a.state] - rank[b.state]);

  const stalled: StalledStep[] = [];
  for (const g of active) {
    for (const n of g.nodes) {
      if (n.status !== "in_motion" && n.status !== "blocked") continue;
      const days = (nowMs - (Date.parse(n.updatedAt) || nowMs)) / DAY;
      if (days >= STALL_DAYS) stalled.push({ goalId: g.id, goalTitle: g.title, nodeTitle: n.title, days: Math.round(days) });
    }
  }
  stalled.sort((a, b) => b.days - a.days);

  const neglected: NeglectedGoal[] = active
    .filter((g) => g.progress < 100)
    .map((g) => ({ goalId: g.id, title: g.title, days: Math.round((nowMs - lastTouched(g)) / DAY) }))
    .filter((x) => x.days >= NEGLECT_DAYS)
    .sort((a, b) => b.days - a.days);

  const behind = paceList.filter((p) => p.state === "behind" || p.state === "overdue").length;
  const withDeadline = paceList.filter((p) => p.state !== "none" && p.state !== "done").length;
  let headline: string;
  if (active.length === 0) headline = "No active goals to weigh in on yet.";
  else if (withDeadline === 0) headline = "Set a deadline on a goal and Solaspace will track your pace to it.";
  else if (behind === 0) headline = "You're on pace across every goal with a deadline.";
  else if (behind === withDeadline) headline = `All ${behind} of your timed goals are behind pace — pick one to pull back.`;
  else headline = `${behind} of ${withDeadline} timed goals ${behind === 1 ? "is" : "are"} slipping behind pace.`;

  return { headline, pace: paceList, stalled, neglected };
}
