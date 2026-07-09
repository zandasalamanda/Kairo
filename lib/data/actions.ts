"use server";

import { revalidatePath } from "next/cache";
import { getScopedClient } from "@/lib/supabase/scoped";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { features } from "@/lib/config";
import { isAdmin } from "@/lib/auth";
import { ensureProfile } from "./profile";
import { isRemote } from "./index";
import { newId } from "@/lib/utils";
import type { GoalMapResult } from "@/lib/ai/types";
import type { NodeStatus, InboxCategory } from "@/types";

type Result = { ok: boolean; id?: string; error?: string };
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

/** Rename / re-describe a node (used by Ask Sola edits). */
export async function updateNode(input: { nodeId: string; title?: string; description?: string }): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const patch: { title?: string; description?: string } = {};
  if (input.title != null) patch.title = input.title.slice(0, 300);
  if (input.description != null) patch.description = input.description.slice(0, 2000);
  if (Object.keys(patch).length === 0) return NO_OP;
  const { error } = await scoped.supabase.from("goal_nodes").update(patch).eq("id", input.nodeId);
  if (error) return NO_OP;
  revalidatePath("/app", "layout");
  return { ok: true, id: input.nodeId };
}

/** Permanently delete the user's data (Supabase rows cascade) and Clerk account. */
export async function deleteAccount(): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  const profile = await ensureProfile();
  if (!scoped || !profile) return NO_OP;

  // 1) Cancel any live Stripe subscription first, so deleting the account never
  //    leaves a customer being billed for an account that no longer exists.
  if (features.stripe && profile.stripeCustomerId) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const subs = await stripe.subscriptions.list({ customer: profile.stripeCustomerId, status: "all", limit: 100 });
      await Promise.all(subs.data.filter((s) => s.status !== "canceled").map((s) => stripe.subscriptions.cancel(s.id)));
      // Delete the Stripe customer too, so no billing PII (email) lingers after erasure.
      await stripe.customers.del(profile.stripeCustomerId);
    } catch (e) {
      console.error("[deleteAccount] Stripe cancel failed", e instanceof Error ? e.message : e);
      return { ok: false, error: "We couldn't cancel your subscription. Nothing was deleted — please try again or contact support." };
    }
  }

  // 2) Delete their data. If this fails, stop — don't delete the Clerk account
  //    and orphan the rows.
  const { error: delErr } = await scoped.supabase.from("users_profile").delete().eq("id", profile.id);
  if (delErr) {
    console.error("[deleteAccount] data delete failed", delErr.message);
    return { ok: false, error: "We couldn't delete your data. Nothing was removed — please try again." };
  }

  // 3) Delete the Clerk account only after the data is confirmed gone.
  const { auth, clerkClient } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (userId) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(userId);
    } catch (e) {
      console.error("[deleteAccount] Clerk delete failed", e instanceof Error ? e.message : e);
      return { ok: false, error: "Your data was deleted, but signing out failed. Please sign out manually." };
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

/** Update the signed-in user's email-notification preferences (via a scoped RPC). */
export async function updateNotificationPrefs(prefs: { email: boolean; deadlines: boolean; nudges: boolean; digest: boolean }): Promise<Result> {
  if (!isRemote) return NO_OP;
  // Write via the service-role client, scoped to the signed-in user's own profile
  // id — reliable regardless of which Postgres role the Clerk token maps to.
  const profile = await ensureProfile();
  const admin = getSupabaseAdmin();
  if (!profile || !admin) return NO_OP;
  const { error } = await admin
    .from("users_profile")
    .update({
      notify_email: prefs.email,
      notify_deadlines: prefs.deadlines,
      notify_nudges: prefs.nudges,
      notify_digest: prefs.digest,
    })
    .eq("id", profile.id);
  if (error) {
    console.error("[updateNotificationPrefs]", error.message);
    return { ok: false, error: "Couldn't save your preferences. Try again." };
  }
  revalidatePath("/app/settings");
  return { ok: true };
}

/** Admin-only: clear the signed-in admin's own AI rate-limit counters (for testing). */
export async function resetMyAiLimits(): Promise<Result> {
  if (!(await isAdmin())) return NO_OP;
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  const admin = getSupabaseAdmin();
  if (!admin || !userId) return NO_OP;
  await admin.from("rate_limits").delete().in("key", [`ai:cd:${userId}`, `ai:cmo:${userId}`, `ai:m:${userId}`]);
  return { ok: true };
}

/** Admin-only: flip the admin's own plan to test the Free vs Pro experience. */
export async function setTestPlan(plan: "free" | "pro"): Promise<Result> {
  if (!(await isAdmin())) return NO_OP;
  const profile = await ensureProfile();
  const admin = getSupabaseAdmin();
  if (!admin || !profile) return NO_OP;
  const { error } = await admin.from("users_profile").update({ plan }).eq("id", profile.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Proof-of-Progress: attach evidence (a link, note, or metric) to a step. */
export async function addNodeEvidence(input: { nodeId: string; kind: "link" | "note" | "metric"; value: string; label?: string }): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  const profile = await ensureProfile();
  if (!scoped || !profile) return NO_OP;
  const value = input.value.trim().slice(0, 500);
  if (!value) return NO_OP;
  const { error } = await scoped.supabase.from("node_evidence").insert({
    node_id: input.nodeId,
    user_id: profile.id,
    kind: input.kind,
    value,
    label: (input.label ?? "").trim().slice(0, 100),
  });
  if (error) {
    console.error("[addNodeEvidence]", error.message);
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/app", "layout");
  return { ok: true };
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

/** Make a goal shareable (idempotent): returns a stable public token. */
export async function shareGoal(input: { goalId: string }): Promise<{ ok: boolean; token?: string }> {
  if (!isRemote) return { ok: false };
  const scoped = await getScopedClient();
  if (!scoped) return { ok: false };
  const existing = await scoped.supabase.from("goals").select("share_id").eq("id", input.goalId).single();
  const current = existing.data?.share_id as string | null | undefined;
  if (current) return { ok: true, token: current };
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const { error } = await scoped.supabase.from("goals").update({ share_id: token }).eq("id", input.goalId);
  if (error) return { ok: false };
  return { ok: true, token };
}

/** Revoke a goal's public link. */
export async function unshareGoal(input: { goalId: string }): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const { error } = await scoped.supabase.from("goals").update({ share_id: null }).eq("id", input.goalId);
  if (error) return NO_OP;
  return { ok: true, id: input.goalId };
}

/** Cache a real resolved resource (live video etc.) on a node so we resolve once. */
export async function setNodeResolvedResource(input: {
  nodeId: string;
  resolved: { url: string; title: string; source: string; thumbnail: string | null };
}): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  if (!scoped) return NO_OP;
  const { error } = await scoped.supabase
    .from("goal_nodes")
    .update({ resource_resolved: input.resolved })
    .eq("id", input.nodeId);
  if (error) return NO_OP;
  return { ok: true, id: input.nodeId };
}

/** Log a completed focus session on a step (powers momentum + focus stats). */
export async function logFocusSession(input: {
  goalId: string;
  nodeId: string;
  minutes: number;
}): Promise<Result> {
  if (!isRemote) return NO_OP;
  const scoped = await getScopedClient();
  const profile = await ensureProfile();
  if (!scoped || !profile) return NO_OP;
  const { error } = await scoped.supabase.from("focus_sessions").insert({
    user_id: profile.id,
    goal_id: input.goalId,
    node_id: input.nodeId,
    minutes: Math.min(600, Math.max(1, Math.round(input.minutes || 1))),
  });
  if (error) return NO_OP;
  revalidatePath("/app/review");
  return { ok: true };
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
