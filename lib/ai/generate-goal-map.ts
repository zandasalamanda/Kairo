import { generateJson, isObj, isClient, viaRoute } from "./provider";
import { mockGoalMap } from "./mock";
import type { GoalMapInput, GoalMapResult } from "./types";

const SYSTEM = `You are Kairo, a calm execution assistant. Turn the user's goal into a structured living-map plan.
Return JSON: {"title":string,"description":string,"suggestedTargetDate":ISO8601 string,"nodes":[{"title":string,"description":string,"status":"in_motion"|"not_started","estimatedMinutes":number,"priority":number,"aiReason":string}],"firstNextAction":string,"weeklyRhythm":string}.
Rules: 5-8 ordered nodes; the first node's status is "in_motion", the rest "not_started"; priority ascends 1..5; be practical and concise, no cheesy motivation; if the goal names a deadline, use it for suggestedTargetDate.`;

function valid(r: unknown): r is GoalMapResult {
  return isObj(r) && typeof r.title === "string" && Array.isArray(r.nodes) && r.nodes.length > 0 && typeof r.firstNextAction === "string";
}

export async function generateGoalMap(input: GoalMapInput): Promise<GoalMapResult> {
  if (isClient()) {
    const j = await viaRoute<GoalMapResult>("/api/ai/goal-map", input);
    return valid(j) ? j : mockGoalMap(input);
  }
  const r = await generateJson<GoalMapResult>(SYSTEM, `Goal: ${input.prompt}`);
  return valid(r) ? r : mockGoalMap(input);
}
