import { generateJson, isObj, isClient, viaRoute } from "./provider";
import { mockGoalMap } from "./mock";
import { parseDeadline } from "@/lib/kairo/deadline";
import { GOAL_ICON_KEYS } from "@/lib/kairo/goal-icon-keys";
import type { GoalMapInput, GoalMapResult, GeneratedNode } from "./types";
import type { NodeResource, ResourceKind } from "@/types";

const SYSTEM = `You are Sola, an execution planner and coach. Turn the user's goal into a DETAILED, DIRECT, step-by-step plan they can start with ZERO further thinking. The goal may include the user's answers to a few quick questions (deadline, level, budget, etc.) — honor them.

Return JSON: {"title":string,"description":string,"suggestedTargetDate":ISO8601,"nodes":[{"title":string,"description":string,"status":"in_motion"|"not_started","estimatedMinutes":number,"priority":number,"aiReason":string,"parentIndex":number|null,"resource":{"kind":"watch"|"read"|"practice","label":string,"query":string}|null}],"firstNextAction":string,"weeklyRhythm":string,"icon":string}.

FORMAT — nodes form a TREE where DEPTH = TIME:
- ONE chronological SPINE of 4-5 milestones. The first has "parentIndex": null; every later milestone's parentIndex is the milestone right before it in time (a chain — later work hangs off earlier work, never a sibling of it).
- Each milestone MUST have 2-3 concrete sub-steps as children (parentIndex = that milestone's index). Total 14-18 nodes. Every parentIndex references an EARLIER index.

STEP TITLES stay short — they label the map — a concrete first action like "Draft the 3 core screens in Figma", never a vague theme like "Design". The "description" is where you HOLD THEIR HAND: 2-4 sentences that are genuinely useful on their own — exactly what to do and how. ALWAYS ground it with 2-3 concrete specifics or REAL NAMED examples (actual tools, companies, people, techniques, places, communities, or numbers relevant to THIS goal), especially for steps with no attached resource. E.g. "Network in aerospace" → name real firms (SpaceX, Blue Origin, Relativity Space), where to reach them (LinkedIn, AIAA events, r/aerospace), and a first concrete outreach. Never vague filler like "quick wins fund the goal".

RESOURCES — be generous: for MOST sub-steps where any external content (a tutorial, guide, template, tool, or calculator) would help them DO it, add "resource": {"kind","label","query"}. "kind": "watch" for a video/tutorial, "practice" for a drill/workout/exercise routine, "read" for an article/guide. "label" is a short human name (≤5 words). "query" is the exact phrase someone would search (specific to the goal, e.g. "winger agility ladder drills soccer"). Set "resource": null for steps where no external content helps (e.g. "email the designer"). Never invent URLs — only a search query.

ICON — also return "icon": the ONE key from this list that best fits the goal: ${GOAL_ICON_KEYS.join(", ")}. Use "target" only if none fit.

nodes[0] is the first milestone with status "in_motion"; all others "not_started". priority ascends along the spine. suggestedTargetDate is after today; resolve any named deadline. Be detailed and direct — no motivation-speak.`;

const ICONS: ReadonlySet<string> = new Set(GOAL_ICON_KEYS);
const KINDS: ReadonlySet<string> = new Set<ResourceKind>(["watch", "read", "practice"]);

function cleanResource(r: unknown): NodeResource | null {
  if (!isObj(r)) return null;
  const kind = String(r.kind ?? "");
  const query = String(r.query ?? "").trim();
  if (!KINDS.has(kind) || !query) return null;
  const label = String(r.label ?? "").trim() || query;
  return { kind: kind as ResourceKind, label: label.slice(0, 60), query: query.slice(0, 120) };
}

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

/** Normalize parent links, statuses, resources, and the icon. */
function normalize(r: GoalMapResult): GoalMapResult {
  const nodes = r.nodes.map((n, i) => {
    const p = n.parentIndex;
    const parentIndex = typeof p === "number" && Number.isInteger(p) && p >= 0 && p < i ? p : null;
    return {
      ...n,
      parentIndex,
      status: i === 0 ? "in_motion" : n.status === "done" ? "done" : "not_started",
      resource: cleanResource(n.resource),
    } as GeneratedNode;
  });
  const icon = typeof r.icon === "string" && ICONS.has(r.icon) ? r.icon : "target";
  return { ...r, nodes, icon };
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
  return normalize(fixDate(r, prompt));
}

export async function generateGoalMap(input: GoalMapInput): Promise<GoalMapResult> {
  if (isClient()) {
    const j = await viaRoute<GoalMapResult>("/api/ai/goal-map", input);
    return valid(j) ? finish(j, input.prompt) : { ...mockGoalMap(input), isMock: true };
  }
  const today = new Date().toISOString().slice(0, 10);
  // 14-18 nodes each with a grounded 2-4 sentence description need real headroom —
  // the default 1600 truncated the JSON mid-string and dead-ended onboarding.
  const r = await generateJson<GoalMapResult>(SYSTEM, `Today's date: ${today}\nGoal: ${input.prompt}`, { maxTokens: 4096 });
  return valid(r) ? finish(r, input.prompt) : { ...mockGoalMap(input), isMock: true };
}
