import type {
  NodeStatus,
  Difficulty,
  EnergyLevel,
  InboxCategory,
  GoalWithNodes,
  DailyPlanWithBlocks,
  NodeResource,
} from "@/types";

// ---------- Goal map generation ----------
export interface GoalMapInput {
  prompt: string;
}

export interface GeneratedNode {
  title: string;
  description: string;
  status: NodeStatus;
  estimatedMinutes: number;
  priority: number;
  aiReason: string;
  /**
   * Index (within this same nodes array) of this node's parent, or null for a
   * top-level phase branching off the goal core. Must reference an earlier
   * index — the map renders the tree from these links.
   */
  parentIndex: number | null;
  /** Optional pointer to content that helps do this step (a search intent). */
  resource?: NodeResource | null;
}

/** A short question the AI can pose to sharpen the plan (answered with a tap). */
export interface Clarifier {
  question: string;
  options: string[];
}

export interface GoalMapResult {
  title: string;
  description: string;
  suggestedTargetDate: string;
  nodes: GeneratedNode[];
  firstNextAction: string;
  weeklyRhythm: string;
  clarifiers?: Clarifier[];
  /** An icon key from GOAL_ICON_KEYS that fits the goal. */
  icon?: string | null;
  /** True when this is the deterministic placeholder (AI unavailable / failed). */
  isMock?: boolean;
}

// ---------- Daily plan ----------
export interface DailyPlanInput {
  availableMinutes: number;
  energy: EnergyLevel;
  context: string;
  goals: GoalWithNodes[];
}

export interface PlannedBlock {
  title: string;
  description: string;
  goalId: string | null;
  nodeId: string | null;
  durationMinutes: number;
  startTime: string | null;
  difficulty: Difficulty;
  reason: string;
}

export interface DailyPlanResult {
  summary: string;
  blocks: PlannedBlock[];
  explanation: string;
  recoveryNote: string | null;
}

// ---------- Inbox sorting ----------
export interface SortInboxInput {
  items: { id: string; content: string }[];
}

export interface SortedItem {
  id: string;
  category: InboxCategory;
  reason: string;
}

export interface SortInboxResult {
  items: SortedItem[];
  reasoning: string;
}

// ---------- node assist (ask / go deeper) ----------
export interface ExpandNodeInput {
  goalTitle: string;
  nodeTitle: string;
  nodeDescription: string;
  /** optional personalization: the user's inline detail + the goal's notebook context */
  context?: string;
}
export interface ExpandNodeResult {
  steps: { title: string; estimatedMinutes: number; aiReason: string }[];
}

export interface AskNodeInput {
  goalTitle: string;
  nodeTitle: string;
  question: string;
  /** the goal's notebook context, so answers use what the user has told Solaspace */
  context?: string;
}
export interface AskNodeResult {
  answer: string;
}

// ---------- work session (co-work on one step) ----------
export interface WorkSessionInput {
  goalTitle: string;
  nodeTitle: string;
  nodeDescription: string;
  /** how long the session is, so the checklist fits the time */
  minutes: number;
  /** the goal's notebook context, so the session is personal */
  context?: string;
}
export interface WorkSessionResult {
  /** "desk" = screen/paper work Solaspace can co-produce; "coach" = physical work it can only brief. */
  kind: "desk" | "coach";
  /** the single smallest action to begin right now */
  firstMove: string;
  /** an ordered checklist of 2-4 micro-actions sized to the session */
  steps: string[];
}

export interface UnblockInput {
  goalTitle: string;
  nodeTitle: string;
  context?: string;
}
export interface UnblockResult {
  answer: string;
}

// ---------- adaptive replan (the living map) ----------
export type ReplanKind = "onramp" | "substep" | "milestone" | "stretch";
export interface ReplanInput {
  goalTitle: string;
  /** the current steps with their status, so proposals match reality */
  nodes: { title: string; status: NodeStatus }[];
  context?: string;
}
export interface ReplanProposal {
  kind: ReplanKind;
  /** title of an existing step to attach under, or null for a new top-level phase */
  parentTitle: string | null;
  title: string;
  estimatedMinutes: number;
  reason: string;
}
export interface ReplanResult {
  proposals: ReplanProposal[];
}

// ---------- extract steps (notebook → map) ----------
export interface ExtractStepsInput {
  goalTitle: string;
  notes: string;
}
export interface ExtractStepsResult {
  steps: string[];
}

// ---------- Ask Sola (agentic plan assistant) ----------
export type SolaChangeKind = "add" | "edit" | "status" | "deadline" | "split";
export interface SolaChange {
  kind: SolaChangeKind;
  goalId: string;
  /** target node for edit/status/split */
  nodeId?: string;
  /** parent for add (null = top-level under the goal) */
  parentId?: string | null;
  title?: string;
  status?: NodeStatus;
  /** deadline as plain text ("in 6 weeks") or ISO */
  date?: string;
  /** split: the sub-step titles */
  into?: string[];
  reason: string;
}
export interface SolaPlanNode {
  id: string;
  parentId: string | null;
  title: string;
  status: NodeStatus;
}
export interface SolaPlanGoal {
  id: string;
  title: string;
  targetDate: string | null;
  nodes: SolaPlanNode[];
}
export interface AskSolaInput {
  message: string;
  plan: SolaPlanGoal[];
}
export interface AskSolaResult {
  reply: string;
  changes: SolaChange[];
}

// ---------- draft (a co-produced artifact for a desk step) ----------
export interface DraftInput {
  goalTitle: string;
  nodeTitle: string;
  nodeDescription: string;
  context?: string;
  /** optional steer from the user, e.g. "make it more formal" */
  instruction?: string;
}
export interface DraftResult {
  /** a 2-4 word label, e.g. "Cover letter draft" */
  title: string;
  /** the actual draft, plain text with line breaks */
  content: string;
}

// ---------- Review ----------
export interface ReviewInput {
  goals: GoalWithNodes[];
  recentPlan?: DailyPlanWithBlocks | null;
}

export interface ReviewResult {
  summary: string;
  changes: string[];
  risks: string[];
  recoverability: string;
  nextBestMove: string;
}
