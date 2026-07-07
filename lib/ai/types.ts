import type {
  NodeStatus,
  Difficulty,
  EnergyLevel,
  InboxCategory,
  GoalWithNodes,
  DailyPlanWithBlocks,
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
}

export interface GoalMapResult {
  title: string;
  description: string;
  suggestedTargetDate: string;
  nodes: GeneratedNode[];
  firstNextAction: string;
  weeklyRhythm: string;
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
}
export interface ExpandNodeResult {
  steps: { title: string; estimatedMinutes: number; aiReason: string }[];
}

export interface AskNodeInput {
  goalTitle: string;
  nodeTitle: string;
  question: string;
}
export interface AskNodeResult {
  answer: string;
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
