// ============================================================
// Kairo domain model (app-facing, camelCase).
// Mirrors the Supabase schema; the data layer maps snake_case rows.
// ============================================================

export type Plan = "free" | "pro";
export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type GoalStatus = "active" | "paused" | "done" | "archived";

export type NodeStatus =
  | "not_started"
  | "in_motion"
  | "blocked"
  | "at_risk"
  | "done";

export type BlockStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "pushed"
  | "skipped";

export type InboxCategory =
  | "unsorted"
  | "must_do"
  | "high_impact"
  | "quick_win"
  | "can_wait"
  | "not_worth_doing";

export type EnergyLevel = "low" | "normal" | "high";
export type Difficulty = "light" | "moderate" | "deep";

/** A one-tap pointer to external content that helps you do a step. */
export type ResourceKind = "watch" | "read" | "practice";
/** A real, live result fetched from a source API (never model-generated). */
export interface ResolvedResource {
  url: string;
  title: string;
  /** channel or domain the result came from */
  source: string;
  thumbnail: string | null;
}
export interface NodeResource {
  kind: ResourceKind;
  /** short human label, e.g. "Winger agility drills" */
  label: string;
  /** the search string we open (never a raw URL — no dead links) */
  query: string;
  /** a real link resolved from `query` via a source API, cached once found */
  resolved?: ResolvedResource | null;
}
export type AiTone = "calm" | "direct" | "strict" | "encouraging";
export type PlanningStyle = "balanced" | "ambitious" | "light" | "deep_work";

export interface UserProfile {
  id: string;
  clerkUserId: string;
  email: string;
  displayName: string;
  stripeCustomerId: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPriceId: string | null;
  plan: Plan;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: GoalStatus;
  /** 0..100 */
  progress: number;
  targetDate: string | null;
  /** AI-chosen icon key from GOAL_ICON_KEYS (null → default). */
  icon: string | null;
  /** freeform notebook context the user writes on this goal. */
  notes: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface GoalNode {
  id: string;
  goalId: string;
  parentId: string | null;
  title: string;
  description: string;
  status: NodeStatus;
  /** 0..100 */
  progress: number;
  /** 1 (highest) .. 5 */
  priority: number;
  estimatedMinutes: number;
  dueDate: string | null;
  positionX: number | null;
  positionY: number | null;
  aiReason: string | null;
  resource: NodeResource | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboxItem {
  id: string;
  userId: string;
  content: string;
  category: InboxCategory;
  source: string;
  convertedGoalId: string | null;
  convertedNodeId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface DailyPlan {
  id: string;
  userId: string;
  planDate: string;
  availableMinutes: number;
  energyLevel: EnergyLevel;
  context: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPlanBlock {
  id: string;
  dailyPlanId: string;
  goalId: string | null;
  nodeId: string | null;
  title: string;
  description: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  status: BlockStatus;
  reason: string;
  difficulty: Difficulty;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ReviewType = "daily" | "weekly" | "recovery";

export interface Review {
  id: string;
  userId: string;
  goalId: string | null;
  reviewType: ReviewType;
  summary: string;
  changes: string[];
  risks: string[];
  recoveryPlan: string[];
  createdAt: string;
}

export interface AiEvent {
  id: string;
  userId: string;
  eventType: string;
  input: unknown;
  output: unknown;
  model: string;
  createdAt: string;
}

/** Momentum + focus-time rollup shown in Review (computed from focus_sessions). */
export interface FocusStats {
  /** consecutive days (up to today) with at least one focus session */
  streakDays: number;
  weekSessions: number;
  weekMinutes: number;
  totalSessions: number;
  totalMinutes: number;
  /** focus time per goal, most-focused first */
  perGoal: { goalId: string; minutes: number; sessions: number }[];
}

// ---- Derived view models used by the UI ----

export interface GoalWithNodes extends Goal {
  nodes: GoalNode[];
}

export interface DailyPlanWithBlocks extends DailyPlan {
  blocks: DailyPlanBlock[];
}
