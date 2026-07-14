import { generateJson, isObj, isClient, viaRoute } from "./provider";
import type { ReplanInput, ReplanResult, ReplanKind } from "./types";

// The living map: given where the user actually is (each step's status + their
// notes), Solaspace proposes 1-3 ADDITIVE changes — an easier on-ramp for a stuck
// step, a missing phase, a stretch once they're ahead. It never removes or
// reorders; proposals are shown for accept/dismiss, never auto-applied.

const KINDS: ReplanKind[] = ["onramp", "substep", "milestone", "stretch"];

const SYSTEM = `You are Sola, revising a plan to fit where the user actually is. You get a goal, its steps each with a status (done / in_motion / blocked / not_started), and optional context notes. Propose 1-3 ADDITIVE, concrete changes that move them forward — never removals or reorderings.
Kinds:
- "onramp": a blocked or stalled step needs an easier step to do FIRST — set parentTitle to that step's exact title.
- "substep": an in_motion step needs a concrete next action — set parentTitle to that step's exact title.
- "milestone": the plan is missing a phase between where they are and the goal — parentTitle null.
- "stretch": most steps are done — add something that pushes past the original goal — parentTitle null.
Return JSON: {"proposals":[{"kind","parentTitle","title","estimatedMinutes","reason"}]}. parentTitle MUST exactly match one of the given step titles, or be null. title is imperative, <=10 words. estimatedMinutes 10-120. reason <=12 words and refers to their actual progress. Never duplicate an existing step. If the plan genuinely needs nothing, return {"proposals":[]}.`;

function valid(r: unknown): r is ReplanResult {
  return isObj(r) && Array.isArray(r.proposals);
}

function clean(r: ReplanResult): ReplanResult {
  return {
    proposals: r.proposals
      .filter((p) => p && typeof p.title === "string" && p.title.trim())
      .slice(0, 3)
      .map((p) => ({
        kind: KINDS.includes(p.kind) ? p.kind : "substep",
        parentTitle: typeof p.parentTitle === "string" && p.parentTitle.trim() ? p.parentTitle.trim() : null,
        title: String(p.title).trim().slice(0, 90),
        estimatedMinutes: Math.min(120, Math.max(10, Math.round(Number(p.estimatedMinutes) || 30))),
        reason: typeof p.reason === "string" ? p.reason.trim().slice(0, 80) : "",
      })),
  };
}

function short(s: string): string {
  return s.replace(/[.?!]+$/, "").toLowerCase();
}

/** Deterministic fallback so the feature still helps with no key. */
function fallback(input: ReplanInput): ReplanResult {
  const stuck = input.nodes.find((n) => n.status === "blocked") ?? input.nodes.find((n) => n.status === "in_motion");
  if (stuck) {
    return { proposals: [{ kind: "onramp", parentTitle: stuck.title, title: `Do a 10-minute first pass at ${short(stuck.title)}`, estimatedMinutes: 15, reason: "Shrink it to get moving again" }] };
  }
  if (input.nodes.length > 0 && input.nodes.every((n) => n.status === "done")) {
    return { proposals: [{ kind: "stretch", parentTitle: null, title: "Set the next, harder version of this goal", estimatedMinutes: 30, reason: "You finished — raise the bar" }] };
  }
  return { proposals: [] };
}

function buildUser(input: ReplanInput): string {
  const steps = input.nodes.map((n, i) => `${i + 1}. [${n.status}] ${n.title}`).join("\n");
  return `Goal: ${input.goalTitle}\nSteps:\n${steps}${input.context ? `\nContext: ${input.context}` : ""}`;
}

export async function replanGoal(input: ReplanInput): Promise<ReplanResult> {
  if (isClient()) {
    const j = await viaRoute<ReplanResult>("/api/ai/replan", input);
    return valid(j) ? clean(j) : fallback(input);
  }
  const r = await generateJson<ReplanResult>(SYSTEM, buildUser(input));
  return valid(r) ? clean(r) : fallback(input);
}
