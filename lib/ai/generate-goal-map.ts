import { generateJson, isObj, isClient, viaRoute } from "./provider";
import { mockGoalMap } from "./mock";
import { parseDeadline } from "@/lib/kairo/deadline";
import { GOAL_ICON_KEYS } from "@/lib/kairo/goal-icon-keys";
import type { GoalMapInput, GoalMapResult, GeneratedNode, Clarifier } from "./types";
import type { NodeResource, ResourceKind } from "@/types";

const SYSTEM = `You are Aether, an execution planner and coach. Turn the user's goal into a DETAILED, DIRECT, step-by-step plan they can start with ZERO further thinking.

Return JSON: {"title":string,"description":string,"suggestedTargetDate":ISO8601,"nodes":[{"title":string,"description":string,"status":"in_motion"|"not_started","estimatedMinutes":number,"priority":number,"aiReason":string,"parentIndex":number|null,"resource":{"kind":"watch"|"read"|"practice","label":string,"query":string}|null}],"firstNextAction":string,"weeklyRhythm":string,"clarifiers":[{"question":string,"options":string[]}],"icon":string}.

FORMAT — nodes form a TREE where DEPTH = TIME:
- ONE chronological SPINE of 4-5 milestones. The first has "parentIndex": null; every later milestone's parentIndex is the milestone right before it in time (a chain — later work hangs off earlier work, never a sibling of it).
- Each milestone MUST have 2-3 concrete sub-steps as children (parentIndex = that milestone's index). Total 14-18 nodes. Every parentIndex references an EARLIER index.

STEP TITLES are a concrete FIRST ACTION they can start now — "Draft the 3 core screens in Figma", never a vague theme like "Design". "description" is one sentence on HOW.

RESOURCES — for each SUB-STEP where a specific piece of external content would genuinely help them DO it (learning something, a technique, a drill, a workout), add "resource": {"kind","label","query"}. "kind": "watch" for a video/tutorial, "practice" for a drill/workout/exercise routine, "read" for an article/guide. "label" is a short human name (≤5 words). "query" is the exact phrase someone would search (specific to the goal, e.g. "winger agility ladder drills soccer"). Set "resource": null for steps where no external content helps (e.g. "email the designer"). Never invent URLs — only a search query.

CLARIFIERS — do NOT ask about the deadline or timeframe (that's always asked separately). Return 2-3 OTHER short questions a sharp coach would ask to make THIS plan concrete and personal: the specifics that materially change the steps or the numbers. Ask what actually shapes the plan for this goal — e.g. a savings goal → monthly income, how much you can set aside, and by when; fitness → current level, days per week, equipment; learning an instrument → current level, practice time per week, deadline. Use ranges as options where a number is needed (e.g. income "<$2k","$2-4k","$4-7k","$7k+"; or "$100/mo","$300/mo","$500/mo+"). Skip generic filler and anything already stated in the goal. Question ≤5 words, each option ≤4 words, 2-4 options each. Return [] only if the goal is already fully specified.

ICON — also return "icon": the ONE key from this list that best fits the goal: ${GOAL_ICON_KEYS.join(", ")}. Use "target" only if none fit.

nodes[0] is the first milestone with status "in_motion"; all others "not_started". priority ascends along the spine. suggestedTargetDate is after today; resolve any named deadline. Be detailed and direct — no motivation-speak.`;

const ICONS: ReadonlySet<string> = new Set(GOAL_ICON_KEYS);

// Always-asked deadline question (the AI is told to leave this to us).
const DEADLINE_CLARIFIER: Clarifier = { question: "Deadline?", options: ["1 month", "3 months", "6 months", "1 year"] };
const DEADLINE_RE = /deadline|time ?frame|by when|due|timeline|how long|when.*(done|finish|complete|by)/i;

const KINDS: ReadonlySet<string> = new Set<ResourceKind>(["watch", "read", "practice"]);

function cleanResource(r: unknown): NodeResource | null {
  if (!isObj(r)) return null;
  const kind = String(r.kind ?? "");
  const query = String(r.query ?? "").trim();
  if (!KINDS.has(kind) || !query) return null;
  const label = String(r.label ?? "").trim() || query;
  return { kind: kind as ResourceKind, label: label.slice(0, 60), query: query.slice(0, 120) };
}

function cleanClarifiers(cs: unknown): Clarifier[] {
  if (!Array.isArray(cs)) return [];
  return cs
    .filter(isObj)
    .slice(0, 3)
    .map((c) => ({
      question: String(c.question ?? "").trim().slice(0, 50),
      options: Array.isArray(c.options) ? c.options.map((o) => String(o).trim().slice(0, 24)).filter(Boolean).slice(0, 4) : [],
    }))
    .filter((c) => c.question && c.options.length >= 2);
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

/** Normalize parent links, statuses, resources, and clarifiers. */
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
  // Deadline is always asked (hardcoded, first); drop any deadline-ish question
  // the model returned so it isn't duplicated.
  const others = cleanClarifiers(r.clarifiers).filter((c) => !DEADLINE_RE.test(c.question));
  const clarifiers = [DEADLINE_CLARIFIER, ...others].slice(0, 3);
  return { ...r, nodes, clarifiers, icon };
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
    return valid(j) ? finish(j, input.prompt) : mockGoalMap(input);
  }
  const today = new Date().toISOString().slice(0, 10);
  const r = await generateJson<GoalMapResult>(SYSTEM, `Today's date: ${today}\nGoal: ${input.prompt}`);
  return valid(r) ? finish(r, input.prompt) : mockGoalMap(input);
}
