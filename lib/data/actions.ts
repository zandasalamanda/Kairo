"use server";

import { revalidatePath } from "next/cache";
import { getScopedClient } from "@/lib/supabase/scoped";
import { ensureProfile } from "./profile";
import { isRemote } from "./index";
import { newId } from "@/lib/utils";
import type { GoalMapResult } from "@/lib/ai/types";
import type { NodeStatus, InboxCategory } from "@/types";

type Result = { ok: boolean; id?: string };
type GoalResult = { ok: boolean; id?: string; nodeIds?: string[] };
const NO_OP: Result = { ok: false };

/**
 * Persist a freshly generated goal map (from onboarding or the map prompt).
 * Returns the new goal id and the node ids (in order) so the client can keep
 * its optimistic state in sync with the real rows.
 */
export async function persistGoalFromMap(input: { result: GoalMapResult }): Promise<GoalResult> {
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
      icon: result.icon ?? null,
    })
    .select("id")
    .single();
  if (goalRes.error || !goalRes.data) return NO_OP;
  const goalId = goalRes.data.id as string;

  // Pre-assign ids so parent links can reference siblings. Insert flat first,
  // then set parent_id for the branches (avoids FK ordering issues).
  const ids = result.nodes.map(() => newId());
  const rows = result.nodes.map((n, i) => ({
    id: ids[i],
    goal_id: goalId,
    title: n.title,
    description: n.description ?? "",
    status: i === 0 ? "in_motion" : n.status === "in_motion" ? "in_motion" : "not_started",
    progress: 0,
    priority: n.priority ?? i + 1,
    estimated_minutes: n.estimatedMinutes ?? 60,
    ai_reason: n.aiReason ?? null,
    resource_kind: n.resource?.kind ?? null,
    resource_label: n.resource?.label ?? null,
    resource_query: n.resource?.query ?? null,
    sort_order: i,
    parent_id: null as string | null,
  }));
  const insErr = (await supabase.from("goal_nodes").insert(rows)).error;
  if (insErr) return NO_OP;

  const branches = result.nodes
    .map((n, i) => ({ i, p: n.parentIndex }))
    .filter((x) => typeof x.p === "number" && x.p >= 0 && x.p < ids.length && x.p < x.i);
  if (branches.length > 0) {
    await Promise.all(
      branches.map((b) => supabase.from("goal_nodes").update({ parent_id: ids[b.p as number] }).eq("id", ids[b.i]))
    );
  }

  revalidatePath("/app", "layout");
  return { ok: true, id: goalId, nodeIds: ids };
}

/**
 * Add a node to a goal. `parentId` attaches it as a branch off another node;
 * null makes it a top-level branch off the goal core.
 */
export async function addNode(input: {
  id: string;
  goalId: string;
  title: string;
  estimatedMinutes: number;
  sortOrder: number;
  parentId?: string | null;
}): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const { error } = await scoped.supabase.from("goal_nodes").insert({
    id: input.id,
    goal_id: input.goalId,
    parent_id: input.parentId ?? null,
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

/** Permanently delete the user's data (Supabase rows cascade) and Clerk account. */
export async function deleteAccount(): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  const profile = await ensureProfile();
  if (!scoped || !profile) return NO_OP;
  await scoped.supabase.from("users_profile").delete().eq("id", profile.id);
  const { auth, clerkClient } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (userId) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(userId);
    } catch {
      /* best effort — the data rows are already gone */
    }
  }
  return { ok: true };
}

/** Delete a goal and everything under it (nodes cascade via FK). */
export async function deleteGoal(input: { goalId: string }): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const { error } = await scoped.supabase.from("goals").delete().eq("id", input.goalId);
  if (error) return NO_OP;
  revalidatePath("/app", "layout");
  return { ok: true, id: input.goalId };
}

/** Save a goal's notebook text. */
export async function setGoalNotes(input: { goalId: string; notes: string }): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const { error } = await scoped.supabase
    .from("goals")
    .update({ notes: input.notes.slice(0, 20000) })
    .eq("id", input.goalId);
  if (error) return NO_OP;
  return { ok: true, id: input.goalId };
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
