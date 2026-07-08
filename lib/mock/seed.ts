import type {
  UserProfile,
  GoalWithNodes,
  GoalNode,
  InboxItem,
  DailyPlanWithBlocks,
  DailyPlanBlock,
} from "@/types";

const now = () => new Date().toISOString();
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}
const DEMO_USER_ID = "demo-user";

function node(partial: Partial<GoalNode> & Pick<GoalNode, "id" | "goalId" | "title">): GoalNode {
  return {
    parentId: null,
    description: "",
    status: "not_started",
    progress: 0,
    priority: 3,
    estimatedMinutes: 60,
    dueDate: null,
    positionX: null,
    positionY: null,
    aiReason: null,
    resource: null,
    createdAt: now(),
    updatedAt: now(),
    ...partial,
  };
}

export interface SeedData {
  profile: UserProfile;
  goals: GoalWithNodes[];
  inbox: InboxItem[];
  todayPlan: DailyPlanWithBlocks;
}

export function buildSeed(): SeedData {
  const profile: UserProfile = {
    id: DEMO_USER_ID,
    clerkUserId: "demo",
    email: "you@kairo.app",
    displayName: "Alex Rivera",
    stripeCustomerId: null,
    subscriptionStatus: "inactive",
    subscriptionPriceId: null,
    plan: "free",
    createdAt: now(),
    updatedAt: now(),
  };

  const launch: GoalWithNodes = {
    id: "g_launch",
    userId: DEMO_USER_ID,
    title: "Launch my app by September",
    description:
      "Ship a real MVP and win the first handful of customers. Solaspace mapped the path so momentum compounds week over week.",
    status: "active",
    progress: 38,
    targetDate: daysFromNow(58),
    icon: "rocket",
    notes: "",
    createdAt: now(),
    updatedAt: now(),
    archivedAt: null,
    nodes: [
      node({ id: "n1", goalId: "g_launch", title: "Define the MVP", status: "done", progress: 100, priority: 1, estimatedMinutes: 60, aiReason: "Scope tightly so you can move", description: "The one thing worth shipping first." }),
      node({ id: "n2", goalId: "g_launch", title: "Design the core flows", status: "in_motion", progress: 55, priority: 2, estimatedMinutes: 90, aiReason: "Know what you're building before you build it", description: "Onboarding, today, and the map." }),
      node({ id: "n3", goalId: "g_launch", title: "Build the foundation", status: "in_motion", progress: 30, priority: 2, estimatedMinutes: 120, aiReason: "The load-bearing work everything sits on", description: "Auth, data, and the app shell." }),
      node({ id: "n5", goalId: "g_launch", title: "Craft the landing page", status: "at_risk", progress: 10, priority: 2, estimatedMinutes: 75, aiReason: "You need a front door before launch", description: "The page that explains the product.", dueDate: daysFromNow(6) }),
      node({ id: "n4", goalId: "g_launch", title: "Test with real users", status: "not_started", priority: 3, estimatedMinutes: 60, aiReason: "Reality checks the plan early" }),
      node({ id: "n6", goalId: "g_launch", title: "Launch", status: "not_started", priority: 4, estimatedMinutes: 90, aiReason: "Ship it — done beats perfect" }),
      node({ id: "n7", goalId: "g_launch", title: "Win first customers", status: "not_started", priority: 5, estimatedMinutes: 60, aiReason: "Proof the thing matters" }),
    ],
  };

  const news: GoalWithNodes = {
    id: "g_news",
    userId: DEMO_USER_ID,
    title: "Grow the newsletter to 1k",
    description: "Build a steady publishing rhythm and reach the first thousand readers.",
    status: "active",
    progress: 22,
    targetDate: daysFromNow(120),
    icon: "growth",
    notes: "",
    createdAt: now(),
    updatedAt: now(),
    archivedAt: null,
    nodes: [
      node({ id: "m1", goalId: "g_news", title: "Define the niche", status: "done", progress: 100, priority: 1, estimatedMinutes: 45, aiReason: "A clear niche makes everything easier" }),
      node({ id: "m2", goalId: "g_news", title: "Set up publishing", status: "in_motion", progress: 40, priority: 2, estimatedMinutes: 60, aiReason: "Remove friction before writing" }),
      node({ id: "m3", goalId: "g_news", title: "Write 5 cornerstone essays", status: "not_started", priority: 2, estimatedMinutes: 90, aiReason: "Depth earns subscribers" }),
      node({ id: "m4", goalId: "g_news", title: "Share consistently", status: "not_started", priority: 3, estimatedMinutes: 30, aiReason: "Distribution is half the work" }),
      node({ id: "m5", goalId: "g_news", title: "Reach 1,000 readers", status: "not_started", priority: 5, estimatedMinutes: 60, aiReason: "The milestone that proves it works" }),
    ],
  };

  const inbox: InboxItem[] = [
    inboxItem("i1", "Email the designer about the logo", "must_do"),
    inboxItem("i2", "Write the onboarding copy", "high_impact"),
    inboxItem("i3", "Fix the broken footer link", "quick_win"),
    inboxItem("i4", "Research competitor pricing pages", "unsorted"),
    inboxItem("i5", "Book the dentist appointment", "unsorted"),
    inboxItem("i6", "Maybe start a podcast someday", "can_wait"),
    inboxItem("i7", "Draft launch tweet thread", "unsorted"),
  ];

  const todayPlan: DailyPlanWithBlocks = {
    id: "plan_today",
    userId: DEMO_USER_ID,
    planDate: new Date().toISOString().slice(0, 10),
    availableMinutes: 120,
    energyLevel: "normal",
    context: "Lighter load today.",
    summary: "3 focus blocks · ~1.5h planned · normal energy",
    createdAt: now(),
    updatedAt: now(),
    blocks: [
      block("b1", { title: "Design the core flows", goalId: "g_launch", nodeId: "n2", durationMinutes: 45, difficulty: "moderate", reason: "Launch my app · unblocks the build", sortOrder: 0 }),
      block("b2", { title: "Build the foundation", goalId: "g_launch", nodeId: "n3", durationMinutes: 45, difficulty: "deep", reason: "Launch my app · the load-bearing work", sortOrder: 1 }),
      block("b3", { title: "Make a start: craft the landing page", goalId: "g_launch", nodeId: "n5", durationMinutes: 20, difficulty: "light", reason: "Recovery block — pulls an at-risk step back", sortOrder: 2 }),
    ],
  };

  return { profile, goals: [launch, news], inbox, todayPlan };
}

function inboxItem(id: string, content: string, category: InboxItem["category"]): InboxItem {
  return {
    id,
    userId: DEMO_USER_ID,
    content,
    category,
    source: "manual",
    convertedGoalId: null,
    convertedNodeId: null,
    createdAt: now(),
    updatedAt: now(),
    archivedAt: null,
  };
}

function block(
  id: string,
  partial: Partial<DailyPlanBlock> & Pick<DailyPlanBlock, "title" | "durationMinutes" | "sortOrder">
): DailyPlanBlock {
  return {
    id,
    dailyPlanId: "plan_today",
    goalId: null,
    nodeId: null,
    description: "",
    startTime: null,
    endTime: null,
    status: "planned",
    reason: "",
    difficulty: "moderate",
    createdAt: now(),
    updatedAt: now(),
    ...partial,
  };
}
