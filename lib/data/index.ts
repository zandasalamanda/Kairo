import { cache } from "react";
import { buildSeed } from "@/lib/mock/seed";
import { features } from "@/lib/config";
import { getScopedClient } from "@/lib/supabase/scoped";
import { ensureProfile } from "./profile";
import { rowToGoal, rowToNode, rowToInbox, rowToEvidence, type GoalRow, type NodeRow, type InboxRow, type EvidenceRow } from "./mappers";
import { computeFocusStats, type FocusSessionRow } from "./focus-stats";
import { computeReviewInsights, type ReviewInsights } from "@/lib/kairo/review-insights";
import type { GoalWithNodes, GoalNode, NodeEvidence, InboxItem, UserProfile, DailyPlanWithBlocks, FocusStats } from "@/types";

// Data-access seam. In demo mode (no Supabase + Clerk) these serve seeded data
// so the app is fully explorable with zero keys. When both are configured,
// each function queries the signed-in user's rows through a Clerk-scoped client
// (RLS enforces per-user access) — the call sites (server components) are unchanged.

/** True when real per-user persistence is active (Supabase + Clerk both wired). */
export const isRemote = features.supabase && features.clerk;

export async function getProfile(): Promise<UserProfile> {
  if (isRemote) {
    const p = await ensureProfile();
    if (p) return p;
  }
  return buildSeed().profile;
}

/** The signed-in user's plan (honours FORCE_PLAN=pro for pre-launch testing). */
export async function getPlan(): Promise<"free" | "pro"> {
  if (process.env.FORCE_PLAN === "pro" && process.env.NODE_ENV !== "production") return "pro";
  if (!isRemote) return "free";
  const p = await ensureProfile();
  return p?.plan === "pro" ? "pro" : "free";
}

export const getGoals = cache(async (): Promise<GoalWithNodes[]> => {
  // Demo mode starts with an empty galaxy — the app opens on "create your first
  // goal", not on fake data. (buildSeed still backs tests + the sign-in backdrop.)
  if (!isRemote) return [];
  const scoped = await getScopedClient();
  const profile = await ensureProfile();
  if (!scoped || !profile) return [];

  const goalsRes = await scoped.supabase
    .from("goals")
    .select("*")
    .eq("user_id", profile.id)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  // Surface a real query failure as an error (retry boundary) instead of an
  // empty galaxy — a transient error must never read as "you have no goals".
  if (goalsRes.error) throw new Error(`Failed to load goals: ${goalsRes.error.message}`);
  const goalRows = (goalsRes.data ?? []) as GoalRow[];
  if (goalRows.length === 0) return [];

  const nodesRes = await scoped.supabase
    .from("goal_nodes")
    .select("*")
    .in("goal_id", goalRows.map((g) => g.id))
    .order("sort_order", { ascending: true });
  if (nodesRes.error) throw new Error(`Failed to load steps: ${nodesRes.error.message}`);
  const nodeRows = (nodesRes.data ?? []) as NodeRow[];

  // Proof-of-Progress: pull any evidence attached to these nodes and group it.
  const evByNode = new Map<string, NodeEvidence[]>();
  if (nodeRows.length > 0) {
    const evRes = await scoped.supabase.from("node_evidence").select("*").in("node_id", nodeRows.map((n) => n.id));
    for (const row of (evRes.data ?? []) as EvidenceRow[]) {
      const list = evByNode.get(row.node_id) ?? [];
      list.push(rowToEvidence(row));
      evByNode.set(row.node_id, list);
    }
  }

  const byGoal = new Map<string, GoalNode[]>();
  for (const row of nodeRows) {
    const node: GoalNode = { ...rowToNode(row), evidence: evByNode.get(row.id) ?? [] };
    const list = byGoal.get(node.goalId) ?? [];
    list.push(node);
    byGoal.set(node.goalId, list);
  }

  return goalRows.map((g) => ({ ...rowToGoal(g), nodes: byGoal.get(g.id) ?? [] }));
});

export async function getGoal(id: string): Promise<GoalWithNodes | null> {
  const goals = await getGoals();
  return goals.find((g) => g.id === id) ?? null;
}

export async function getPrimaryGoal(): Promise<GoalWithNodes | null> {
  const goals = await getGoals();
  return goals[0] ?? null;
}

export const getInbox = cache(async (): Promise<InboxItem[]> => {
  if (!isRemote) return [];
  const scoped = await getScopedClient();
  const profile = await ensureProfile();
  if (!scoped || !profile) return [];

  const res = await scoped.supabase
    .from("inbox_items")
    .select("*")
    .eq("user_id", profile.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (res.error) throw new Error(`Failed to load inbox: ${res.error.message}`);
  return ((res.data ?? []) as InboxRow[]).map(rowToInbox);
});

export async function getTodayPlan(): Promise<DailyPlanWithBlocks | null> {
  // No persisted daily plan — Today (the Cockpit) is derived live from goals.
  return null;
}

/** The Mirror: pace-to-deadline + stalled/neglected insights for Review. */
export async function getReviewInsights(): Promise<ReviewInsights | null> {
  const goals = await getGoals();
  if (goals.length === 0) return null;
  return computeReviewInsights(goals, Date.now());
}

/** Momentum + focus-time rollup for Review, computed from the user's focus sessions. */
export const getFocusStats = cache(async (): Promise<FocusStats> => {
  const empty: FocusStats = { streakDays: 0, weekSessions: 0, weekMinutes: 0, totalSessions: 0, totalMinutes: 0, perGoal: [] };
  if (!isRemote) return empty;
  const scoped = await getScopedClient();
  const profile = await ensureProfile();
  if (!scoped || !profile) return empty;

  const res = await scoped.supabase
    .from("focus_sessions")
    .select("goal_id, minutes, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(2000);
  return computeFocusStats((res.data ?? []) as FocusSessionRow[], Date.now());
});
