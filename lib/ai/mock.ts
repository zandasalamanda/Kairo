// Deterministic, dependency-free mock generators.
// These run whenever no AI key is configured so the app is fully usable in
// preview. Outputs are structured to match the real AI contract exactly.

import type {
  GoalMapInput,
  GoalMapResult,
  GeneratedNode,
  DailyPlanInput,
  DailyPlanResult,
  PlannedBlock,
  SortInboxInput,
  SortInboxResult,
  SortedItem,
  ReviewInput,
  ReviewResult,
} from "./types";
import type { Difficulty, GoalNode, InboxCategory } from "@/types";
import { parseDeadline } from "@/lib/kairo/deadline";

// ---------- helpers ----------

function cleanTitle(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, " ").replace(/[.…]+$/, "");
  if (!t) return "New goal";
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return capped.length > 80 ? capped.slice(0, 77) + "…" : capped;
}

interface TemplateNode {
  title: string;
  est: number;
  reason: string;
  /** Concrete do-this-now sub-steps that branch off this phase. */
  sub?: { title: string; est: number; reason: string }[];
}

interface Template {
  match: RegExp;
  description: (title: string) => string;
  rhythm: string;
  weeks: number;
  nodes: TemplateNode[];
}

const TEMPLATES: Template[] = [
  {
    match: /\b(launch|build|ship|app|startup|product|project|website|business)\b/i,
    description: (t) =>
      `A focused build toward "${t}". Aether mapped the path from a clear MVP to your first real users, ordered so momentum compounds.`,
    rhythm: "3 focus blocks / week · ~90 min each",
    weeks: 9,
    nodes: [
      { title: "Define the MVP", est: 60, reason: "Scope tightly so you can move", sub: [
        { title: "List every feature you imagine", est: 20, reason: "Get it all out of your head" },
        { title: "Circle the 3 that prove the idea", est: 20, reason: "Everything else is later" },
      ] },
      { title: "Design the core flows", est: 90, reason: "Know what you're building before you build it", sub: [
        { title: "Sketch the 3 key screens", est: 45, reason: "Paper is faster than code" },
        { title: "Pick colors and type", est: 30, reason: "One look, decided once" },
      ] },
      { title: "Build the foundation", est: 120, reason: "The load-bearing work everything sits on", sub: [
        { title: "Set up auth + database", est: 90, reason: "Every feature leans on this" },
        { title: "Ship one flow end to end", est: 90, reason: "Prove the stack works" },
      ] },
      { title: "Test with real users", est: 60, reason: "Reality checks the plan early", sub: [
        { title: "Watch 3 people use it", est: 45, reason: "You'll see what to fix instantly" },
      ] },
      { title: "Craft the landing page", est: 75, reason: "You need a front door before launch" },
      { title: "Launch", est: 90, reason: "Ship it — done beats perfect" },
      { title: "Win first customers", est: 60, reason: "Proof the thing matters" },
    ],
  },
  {
    match: /\b(study|exam|finals?|learn|school|course|class|degree|test)\b/i,
    description: (t) =>
      `A calm study path toward "${t}". Aether turned it into a rhythm you can actually hold, weighted toward your weak spots.`,
    rhythm: "5 study blocks / week · ~45 min each",
    weeks: 6,
    nodes: [
      { title: "Map the syllabus", est: 45, reason: "See the whole terrain first", sub: [
        { title: "List every topic to cover", est: 25, reason: "Nothing hides until exam day" },
        { title: "Mark the 5 you're shakiest on", est: 15, reason: "That's where the points are" },
      ] },
      { title: "Gather your materials", est: 30, reason: "Remove friction before it starts" },
      { title: "Build a study rhythm", est: 45, reason: "Consistency beats cramming", sub: [
        { title: "Block 5 study slots this week", est: 15, reason: "A time on the calendar is a promise" },
      ] },
      { title: "Drill the weak spots", est: 60, reason: "Spend time where it moves the grade" },
      { title: "Take a mock test", est: 90, reason: "Practice under real conditions" },
      { title: "Final review pass", est: 60, reason: "Consolidate before the day" },
    ],
  },
  {
    match: /\b(save|money|budget|debt|finance|invest|spend)\b/i,
    description: (t) =>
      `A steady plan toward "${t}". Aether broke it into small, repeatable moves so progress compounds without stress.`,
    rhythm: "2 money blocks / week · ~30 min each",
    weeks: 12,
    nodes: [
      { title: "Map current spending", est: 45, reason: "You can't change what you can't see" },
      { title: "Set a clear target", est: 30, reason: "A number gives the plan direction" },
      { title: "Cut three leaks", est: 45, reason: "Quick wins fund the goal" },
      { title: "Automate saving", est: 30, reason: "Make progress happen without willpower" },
      { title: "Build a buffer", est: 60, reason: "Safety keeps the plan alive" },
      { title: "Review monthly", est: 30, reason: "Small corrections keep you on track" },
    ],
  },
  {
    match: /\b(routine|habit|organi[sz]e|health|fit|fitness|gym|run|sleep|clean)\b/i,
    description: (t) =>
      `A grounded path toward "${t}". Aether started small and stackable so the routine sticks instead of stalling.`,
    rhythm: "Daily anchor · ~20 min",
    weeks: 8,
    nodes: [
      { title: "Define the routine", est: 30, reason: "Decide once, not every day" },
      { title: "Prep the environment", est: 30, reason: "Make the right move the easy move" },
      { title: "Start small, daily", est: 20, reason: "Tiny and repeated beats big and rare" },
      { title: "Track for two weeks", est: 20, reason: "Data shows what's working" },
      { title: "Adjust the plan", est: 30, reason: "Tune it to your real life" },
      { title: "Lock it in", est: 20, reason: "Make it automatic" },
    ],
  },
];

const DEFAULT_TEMPLATE: Template = {
  match: /.*/,
  description: (t) =>
    `A clear path toward "${t}". Aether broke it into ordered steps so you always know the next move.`,
  rhythm: "3 focus blocks / week · ~60 min each",
  weeks: 8,
  nodes: [
    { title: "Clarify the outcome", est: 45, reason: "Define what done looks like", sub: [
      { title: "Write the goal in one sentence", est: 20, reason: "If you can't, it's not clear yet" },
      { title: "Name how you'll know it's done", est: 25, reason: "A finish line you can see" },
    ] },
    { title: "Break it into parts", est: 45, reason: "Big goals move as small pieces", sub: [
      { title: "List the 3-5 big chunks", est: 30, reason: "Each becomes its own branch" },
    ] },
    { title: "Set the first milestone", est: 60, reason: "A near target creates momentum" },
    { title: "Do the core work", est: 90, reason: "The part that actually matters" },
    { title: "Review progress", est: 30, reason: "Catch drift before it compounds" },
    { title: "Finish strong", est: 60, reason: "Close it out cleanly" },
  ],
};

function pickTemplate(prompt: string): Template {
  return TEMPLATES.find((t) => t.match.test(prompt)) ?? DEFAULT_TEMPLATE;
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

// ---------- goal map ----------

export function mockGoalMap(input: GoalMapInput): GoalMapResult {
  const title = cleanTitle(input.prompt);
  const tpl = pickTemplate(input.prompt);

  // Flatten depth-first into a chronological SPINE: each milestone chains off
  // the previous one (parentIndex = previous milestone), and its sub-steps hang
  // off it. Depth = time, so nothing sequential ends up as a sibling at the root.
  const flat: { title: string; est: number; reason: string; parentIndex: number | null }[] = [];
  let prevPhase: number | null = null;
  tpl.nodes.forEach((phase) => {
    const phaseIndex = flat.length;
    flat.push({ title: phase.title, est: phase.est, reason: phase.reason, parentIndex: prevPhase });
    (phase.sub ?? []).forEach((c) => flat.push({ title: c.title, est: c.est, reason: c.reason, parentIndex: phaseIndex }));
    prevPhase = phaseIndex;
  });

  const nodes: GeneratedNode[] = flat.map((n, i) => ({
    title: n.title,
    description: n.reason + ".",
    status: i === 0 ? "in_motion" : "not_started",
    estimatedMinutes: n.est,
    priority: Math.min(5, i + 1),
    aiReason: n.reason,
    parentIndex: n.parentIndex,
  }));
  // Honor a deadline written in plain English ("by September", "in 6 weeks");
  // otherwise fall back to the template's suggested horizon.
  const deadline = parseDeadline(input.prompt);
  return {
    title,
    description: tpl.description(title),
    suggestedTargetDate: deadline ? deadline.iso : isoDaysFromNow(tpl.weeks * 7),
    nodes,
    firstNextAction: `Spend 25 minutes to ${tpl.nodes[0].title.toLowerCase()}`,
    weeklyRhythm: tpl.rhythm,
  };
}

// ---------- daily plan ----------

function difficultyFor(minutes: number, energy: DailyPlanInput["energy"]): Difficulty {
  if (energy === "low") return "light";
  if (minutes >= 75) return energy === "high" ? "deep" : "moderate";
  if (minutes >= 45) return "moderate";
  return "light";
}

/** Workable nodes, best-first: in_motion, then at_risk, then not_started. */
function candidateNodes(input: DailyPlanInput): { node: GoalNode; goalId: string; goalTitle: string }[] {
  const rank: Record<string, number> = { in_motion: 0, at_risk: 1, not_started: 2 };
  const out: { node: GoalNode; goalId: string; goalTitle: string }[] = [];
  for (const g of input.goals) {
    for (const n of g.nodes) {
      if (n.status === "done" || n.status === "blocked") continue;
      out.push({ node: n, goalId: g.id, goalTitle: g.title });
    }
  }
  return out.sort((a, b) => {
    const r = (rank[a.node.status] ?? 3) - (rank[b.node.status] ?? 3);
    if (r !== 0) return r;
    return a.node.priority - b.node.priority;
  });
}

export function mockDailyPlan(input: DailyPlanInput): DailyPlanResult {
  const candidates = candidateNodes(input);
  const budget = input.availableMinutes;
  const cap = input.energy === "low" ? 30 : input.energy === "high" ? 120 : 60;

  // No clock times — the plan is an ordered list for today (order = array index).
  const blocks: PlannedBlock[] = [];
  let used = 0;

  for (const c of candidates) {
    if (used >= budget) break;
    const remaining = budget - used;
    let minutes = Math.min(c.node.estimatedMinutes, cap, remaining);
    if (minutes < 15) continue;
    minutes = Math.round(minutes / 5) * 5;

    blocks.push({
      title:
        input.energy === "low" && c.node.estimatedMinutes > minutes
          ? `Make a start: ${c.node.title.toLowerCase()}`
          : c.node.title,
      description: c.node.description || c.node.aiReason || "",
      goalId: c.goalId,
      nodeId: c.node.id,
      durationMinutes: minutes,
      startTime: null,
      difficulty: difficultyFor(minutes, input.energy),
      reason: `${c.goalTitle} · ${c.node.aiReason ?? "keeps the goal moving"}`,
    });
    used += minutes;
  }

  const hours = Math.round((used / 60) * 10) / 10;
  const atRisk = candidates.find((c) => c.node.status === "at_risk");

  const summary =
    blocks.length === 0
      ? "No blocks fit today — add time or unblock a node to build a plan."
      : `${blocks.length} focus block${blocks.length > 1 ? "s" : ""} · ~${hours}h planned · ${input.energy} energy`;

  const explanation =
    blocks.length === 0
      ? "Every workable node needs more room than today's budget. Try a longer window, or make a task smaller."
      : input.energy === "low"
        ? "Energy is low, so Aether kept blocks short and light — momentum matters more than volume today."
        : input.energy === "high"
          ? "Energy is high, so Aether front-loaded the deepest work while you can carry it."
          : "Aether balanced the day around what actually moves your goals, ordered by momentum.";

  const recoveryNote = atRisk
    ? `"${atRisk.node.title}" is at risk. One of today's blocks targets it to pull the timeline back.`
    : null;

  return { summary, blocks, explanation, recoveryNote };
}

// ---------- inbox sorting ----------

// Order matters: urgency wins first, then explicit deferral signals
// ("maybe/someday") outrank impact keywords, then impact, then quick wins.
const CATEGORY_RULES: { category: InboxCategory; match: RegExp; reason: string }[] = [
  { category: "must_do", match: /\b(urgent|today|deadline|due|asap|now|pay|bill|email|submit|call)\b/i, reason: "Time-sensitive — do it first" },
  { category: "not_worth_doing", match: /\b(maybe|someday|random|scroll|browse|watch)\b/i, reason: "Low value — let it go" },
  { category: "high_impact", match: /\b(launch|build|design|write|plan|create|ship|grow|study|learn)\b/i, reason: "Moves a goal forward" },
  { category: "quick_win", match: /\b(fix|update|reply|book|send|order|check|rename|tidy)\b/i, reason: "Small and fast — clear it" },
  { category: "can_wait", match: /.*/, reason: "Fine to hold for later" },
];

export function mockSortInbox(input: SortInboxInput): SortInboxResult {
  const items: SortedItem[] = input.items.map((it) => {
    const rule = CATEGORY_RULES.find((r) => r.match.test(it.content)) ?? CATEGORY_RULES[CATEGORY_RULES.length - 1];
    // very short items lean toward quick wins
    const category =
      rule.category === "can_wait" && it.content.trim().split(/\s+/).length <= 2
        ? "quick_win"
        : rule.category;
    return { id: it.id, category, reason: rule.reason };
  });
  const mustDo = items.filter((i) => i.category === "must_do").length;
  const reasoning =
    items.length === 0
      ? "Nothing to sort yet."
      : `Sorted ${items.length} item${items.length > 1 ? "s" : ""} by urgency and impact${mustDo ? `, surfacing ${mustDo} that need attention first` : ""}.`;
  return { items, reasoning };
}

// ---------- review ----------

export function mockReview(input: ReviewInput): ReviewResult {
  const allNodes = input.goals.flatMap((g) => g.nodes.map((n) => ({ n, g })));
  const done = allNodes.filter((x) => x.n.status === "done");
  const moving = allNodes.filter((x) => x.n.status === "in_motion");
  const atRisk = allNodes.filter((x) => x.n.status === "at_risk");
  const blocked = allNodes.filter((x) => x.n.status === "blocked");
  const pushed = input.recentPlan?.blocks.filter((b) => b.status === "pushed") ?? [];

  const changes: string[] = [];
  if (done.length) changes.push(`${done.length} step${done.length > 1 ? "s" : ""} completed across your goals`);
  if (moving.length) changes.push(`${moving.length} step${moving.length > 1 ? "s" : ""} now in motion`);
  if (pushed.length) changes.push(`${pushed.length} block${pushed.length > 1 ? "s" : ""} pushed to later`);
  if (changes.length === 0) changes.push("A quiet stretch — nothing moved yet");

  const risks: string[] = [
    ...atRisk.map((x) => `"${x.n.title}" is slipping in ${x.g.title}`),
    ...blocked.map((x) => `"${x.n.title}" is blocked in ${x.g.title}`),
  ];

  const recoverable = risks.length <= 2;
  const recoverability = recoverable
    ? risks.length === 0
      ? "You're on track. No recovery needed."
      : "The plan is still recoverable. A single focused block pulls it back."
    : "Several things are slipping. Rebuild today's plan around the two that matter most.";

  const next =
    atRisk[0]?.n.title ??
    moving[0]?.n.title ??
    allNodes.find((x) => x.n.status === "not_started")?.n.title ??
    "Review your goal map";

  const summary = pushed.length
    ? `You pushed ${pushed.length} block${pushed.length > 1 ? "s" : ""}. Your estimate moved, but ${recoverable ? "the plan holds" : "it needs a rebuild"}.`
    : done.length
      ? `Good movement — ${done.length} step${done.length > 1 ? "s" : ""} done. Keep the rhythm going.`
      : "Here's where your goals stand and the single best move next.";

  return {
    summary,
    changes,
    risks,
    recoverability,
    nextBestMove: `Add one focused block for "${next}" to keep momentum.`,
  };
}
