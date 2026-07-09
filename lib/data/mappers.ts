// snake_case Supabase rows -> camelCase app models.
// Columns mirror supabase/migrations/0001_init.sql (+ 0002 sort_order).

import type {
  UserProfile,
  Goal,
  GoalNode,
  InboxItem,
  Plan,
  SubscriptionStatus,
  GoalStatus,
  NodeStatus,
  InboxCategory,
  ResourceKind,
  ResolvedResource,
  NodeEvidence,
} from "@/types";

export interface ProfileRow {
  id: string;
  clerk_user_id: string;
  email: string | null;
  display_name: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_price_id: string | null;
  plan: Plan;
  notify_email?: boolean;
  notify_deadlines?: boolean;
  notify_nudges?: boolean;
  notify_digest?: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: GoalStatus;
  progress: number;
  target_date: string | null;
  icon: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface NodeRow {
  id: string;
  goal_id: string;
  parent_id: string | null;
  title: string;
  description: string;
  status: NodeStatus;
  progress: number;
  priority: number;
  estimated_minutes: number;
  due_date: string | null;
  position_x: number | null;
  position_y: number | null;
  ai_reason: string | null;
  resource_kind: ResourceKind | null;
  resource_label: string | null;
  resource_query: string | null;
  resource_resolved: ResolvedResource | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InboxRow {
  id: string;
  user_id: string;
  content: string;
  category: InboxCategory;
  source: string;
  converted_goal_id: string | null;
  converted_node_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export function rowToProfile(r: ProfileRow): UserProfile {
  return {
    id: r.id,
    clerkUserId: r.clerk_user_id,
    email: r.email ?? "",
    displayName: r.display_name ?? "You",
    stripeCustomerId: r.stripe_customer_id,
    subscriptionStatus: r.subscription_status,
    subscriptionPriceId: r.subscription_price_id,
    plan: r.plan,
    notifyEmail: r.notify_email ?? true,
    notifyDeadlines: r.notify_deadlines ?? true,
    notifyNudges: r.notify_nudges ?? true,
    notifyDigest: r.notify_digest ?? true,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description,
    status: r.status,
    progress: r.progress,
    targetDate: r.target_date,
    icon: r.icon,
    notes: r.notes ?? "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archivedAt: r.archived_at,
  };
}

export function rowToNode(r: NodeRow): GoalNode {
  return {
    id: r.id,
    goalId: r.goal_id,
    parentId: r.parent_id,
    title: r.title,
    description: r.description,
    status: r.status,
    progress: r.progress,
    priority: r.priority,
    estimatedMinutes: r.estimated_minutes,
    dueDate: r.due_date,
    positionX: r.position_x,
    positionY: r.position_y,
    aiReason: r.ai_reason,
    resource: r.resource_kind && r.resource_query
      ? { kind: r.resource_kind, label: r.resource_label ?? r.resource_query, query: r.resource_query, resolved: r.resource_resolved ?? null }
      : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToInbox(r: InboxRow): InboxItem {
  return {
    id: r.id,
    userId: r.user_id,
    content: r.content,
    category: r.category,
    source: r.source,
    convertedGoalId: r.converted_goal_id,
    convertedNodeId: r.converted_node_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archivedAt: r.archived_at,
  };
}

export interface EvidenceRow {
  id: string;
  node_id: string;
  user_id: string;
  kind: "link" | "note" | "metric";
  value: string;
  label: string;
  created_at: string;
}

export function rowToEvidence(r: EvidenceRow): NodeEvidence {
  return { id: r.id, kind: r.kind, value: r.value, label: r.label, createdAt: r.created_at };
}
