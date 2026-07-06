"use server";

import { revalidatePath } from "next/cache";
import { getScopedClient } from "@/lib/supabase/scoped";
import { ensureProfile } from "./profile";
import { isRemote } from "./index";
import type { GoalMapResult } from "@/lib/ai/types";
import type { NodeStatus, InboxCategory } from "@/types";

type Result = { ok: boolean; id?: string };
const NO_OP: Result = { ok: false };

/**
 * Persist a freshly generated goal map (from onboarding or the map prompt).
 * Returns the new goal id so the caller can deep-link to it.
 */
export async function persistGoalFromMap(input: { result: GoalMapResult }): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  const profile = await ensureProfile();
  if (!scoped || !profile) return NO_OP;
  const { supabase } = scoped;
  const { result } = input;

  const goalRes = await supabase
    .from("goals")
    .insert({
      user_id: profile.id,
      title: result.title,
      description: result.description ?? "",
      status: "active",
      progress: 0,
      target_date: result.suggestedTargetDate ?? null,
    })
    .select("id")
    .single();
  if (goalRes.error || !goalRes.data) return NO_OP;
  const goalId = goalRes.data.id as string;

  const rows = result.nodes.map((n, i) => ({
    goal_id: goalId,
    title: n.title,
    description: n.description ?? "",
    status: i === 0 ? "in_motion" : n.status === "in_motion" ? "in_motion" : "not_started",
    progress: 0,
    priority: n.priority ?? i + 1,
    estimated_minutes: n.estimatedMinutes ?? 60,
    ai_reason: n.aiReason ?? null,
    sort_order: i,
  }));
  await supabase.from("goal_nodes").insert(rows);

  revalidatePath("/app", "layout");
  return { ok: true, id: goalId };
}

/** Add a single node to an existing goal (map prompt bar). */
export async function addNode(input: {
  id: string;
  goalId: string;
  title: string;
  estimatedMinutes: number;
  sortOrder: number;
}): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const { error } = await scoped.supabase.from("goal_nodes").insert({
    id: input.id,
    goal_id: input.goalId,
    title: input.title,
    status: "not_started",
    priority: 3,
    estimated_minutes: input.estimatedMinutes,
    ai_reason: "Added from the map",
    sort_order: input.sortOrder,
  });
  if (error) return NO_OP;
  revalidatePath("/app", "layout");
  return { ok: true, id: input.id };
}

/** Change a node's status and recompute its goal's overall progress. */
export async function setNodeStatus(input: {
  goalId: string;
  nodeId: string;
  status: NodeStatus;
}): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const { supabase } = scoped;

  const patch: { status: NodeStatus; progress?: number } = { status: input.status };
  if (input.status === "done") patch.progress = 100;
  const upd = await supabase.from("goal_nodes").update(patch).eq("id", input.nodeId);
  if (upd.error) return NO_OP;

  // Recompute goal progress from its nodes (share of done nodes).
  const nodesRes = await supabase.from("goal_nodes").select("status").eq("goal_id", input.goalId);
  const nodes = (nodesRes.data ?? []) as { status: NodeStatus }[];
  if (nodes.length > 0) {
    const done = nodes.filter((n) => n.status === "done").length;
    const progress = Math.round((done / nodes.length) * 100);
    await supabase.from("goals").update({ progress }).eq("id", input.goalId);
  }

  revalidatePath("/app", "layout");
  return { ok: true, id: input.nodeId };
}

/** Set a goal's target date (from a plain-English deadline). */
export async function setGoalDeadline(input: { goalId: string; iso: string }): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const { error } = await scoped.supabase
    .from("goals")
    .update({ target_date: input.iso })
    .eq("id", input.goalId);
  if (error) return NO_OP;
  revalidatePath("/app", "layout");
  return { ok: true, id: input.goalId };
}

/** Capture a new inbox item. */
export async function addInboxItem(input: { id: string; content: string }): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  const profile = await ensureProfile();
  if (!scoped || !profile) return NO_OP;
  const { error } = await scoped.supabase.from("inbox_items").insert({
    id: input.id,
    user_id: profile.id,
    content: input.content,
    category: "unsorted",
  });
  if (error) return NO_OP;
  revalidatePath("/app/inbox");
  return { ok: true, id: input.id };
}

/** Apply AI-sorted categories to a batch of inbox items. */
export async function applyInboxSort(
  updates: { id: string; category: InboxCategory }[]
): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const { supabase } = scoped;
  await Promise.all(
    updates.map((u) => supabase.from("inbox_items").update({ category: u.category }).eq("id", u.id))
  );
  revalidatePath("/app/inbox");
  return { ok: true };
}

/** Remove an inbox item (soft-delete: archived, so it can be recovered/converted). */
export async function archiveInboxItem(input: { id: string }): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const { error } = await scoped.supabase
    .from("inbox_items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", input.id);
  if (error) return NO_OP;
  revalidatePath("/app/inbox");
  return { ok: true, id: input.id };
}
