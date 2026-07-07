import { generateJson, isObj, isClient, viaRoute } from "./provider";
import { mockGoalMap } from "./mock";
import { parseDeadline } from "@/lib/kairo/deadline";
import type { GoalMapInput, GoalMapResult, GeneratedNode } from "./types";

const SYSTEM = `You are Aether, an execution planner. Turn the user's goal into a DETAILED, DIRECT, step-by-step plan they can follow with ZERO further thinking — as if a sharp friend already worked out exactly what to do and in what order.

Return JSON: {"title":string,"description":string,"suggestedTargetDate":ISO8601,"nodes":[{"title":string,"description":string,"status":"in_motion"|"not_started","estimatedMinutes":number,"priority":number,"aiReason":string,"parentIndex":number|null}],"firstNextAction":string,"weeklyRhythm":string}.

FORMAT — read carefully. The nodes form a TREE where DEPTH REPRESENTS TIME:
- There is ONE chronological SPINE of milestones. The FIRST milestone has "parentIndex": null. EVERY later milestone's "parentIndex" is the index of the milestone that comes DIRECTLY BEFORE it in time — so milestones form a chain, each hanging off the previous one.
- NEVER make two things that happen at different times both top-level or both children of the same node when one must finish before the other starts — that reads to the user as "do these at the same time." If B can only happen after A, B's parent is A.
- Under each milestone, attach its concrete sub-steps as children (parentIndex = that milestone's index). Sub-steps of the SAME milestone happen around the same time, so they may share that parent.
- 4-6 milestones on the spine, each with 2-3 sub-steps. 12-20 nodes total. Every parentIndex references an EARLIER index.

Rules: nodes[0] is the first milestone, status "in_motion"; every other node "not_started". "title" is imperative and specific ("Draft the 3 core screens" — not "Design"). "description" is ONE concrete sentence on HOW. "estimatedMinutes" is realistic (a single sitting). "priority" ascends along the spine (1..5). "aiReason" is a short why. "firstNextAction" is the literal first thing to open or do. "suggestedTargetDate" must be after today's date; resolve any named deadline (e.g. "by December") to its next occurrence. Be detailed and direct — no motivation-speak, no filler.`;

function isNode(n: unknown): n is GeneratedNode {
  return isObj(n) && typeof n.title === "string";
}

function valid(r: unknown): r is GoalMapResult {
  return (
    isObj(r) &&
    typeof r.title === "string" &&
    Array.isArray(r.nodes) &&
    r.nodes.length > 0 &&
    r.nodes.every(isNode) &&
    typeof r.firstNextAction === "string"
  );
}

/** Ensure every parentIndex is null or points to a strictly-earlier node. */
function normalizeTree(r: GoalMapResult): GoalMapResult {
  const nodes = r.nodes.map((n, i) => {
    const p = n.parentIndex;
    const parentIndex = typeof p === "number" && Number.isInteger(p) && p >= 0 && p < i ? p : null;
    return { ...n, parentIndex, status: i === 0 ? "in_motion" : n.status === "done" ? "done" : "not_started" } as GeneratedNode;
  });
  return { ...r, nodes };
}

// Guard against the model returning a past/invalid target date (it may not know today).
function fixDate(r: GoalMapResult, prompt: string): GoalMapResult {
  const t = new Date(r.suggestedTargetDate).getTime();
  if (Number.isFinite(t) && t > Date.now()) return r;
  const parsed = parseDeadline(prompt);
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 56);
  fallback.setHours(12, 0, 0, 0);
  return { ...r, suggestedTargetDate: parsed ? parsed.iso : fallback.toISOString() };
}

function finish(r: GoalMapResult, prompt: string): GoalMapResult {
  return normalizeTree(fixDate(r, prompt));
}

export async function generateGoalMap(input: GoalMapInput): Promise<GoalMapResult> {
  if (isClient()) {
    const j = await viaRoute<GoalMapResult>("/api/ai/goal-map", input);
    return valid(j) ? finish(j, input.prompt) : mockGoalMap(input);
  }
  const today = new Date().toISOString().slice(0, 10);
  const r = await generateJson<GoalMapResult>(SYSTEM, `Today's date: ${today}\nGoal: ${input.prompt}`);
  return valid(r) ? finish(r, input.prompt) : mockGoalMap(input);
}
