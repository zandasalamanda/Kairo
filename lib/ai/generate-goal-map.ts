import { generateJson, isObj, isClient, viaRoute } from "./provider";
import { mockGoalMap } from "./mock";
import { parseDeadline } from "@/lib/kairo/deadline";
import type { GoalMapInput, GoalMapResult } from "./types";

const SYSTEM = `You are Aether, a calm execution assistant. Turn the user's goal into a structured living-map plan.
Return JSON: {"title":string,"description":string,"suggestedTargetDate":ISO8601 string,"nodes":[{"title":string,"description":string,"status":"in_motion"|"not_started","estimatedMinutes":number,"priority":number,"aiReason":string}],"firstNextAction":string,"weeklyRhythm":string}.
Rules: 5-8 ordered nodes; the first node's status is "in_motion", the rest "not_started"; priority ascends 1..5; be practical and concise, no cheesy motivation. suggestedTargetDate MUST be in the future relative to the provided today's date; resolve any named deadline (e.g. "by December") to its next occurrence after today.`;

function valid(r: unknown): r is GoalMapResult {
  return isObj(r) && typeof r.title === "string" && Array.isArray(r.nodes) && r.nodes.length > 0 && typeof r.firstNextAction === "string";
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

export async function generateGoalMap(input: GoalMapInput): Promise<GoalMapResult> {
  if (isClient()) {
    const j = await viaRoute<GoalMapResult>("/api/ai/goal-map", input);
    return valid(j) ? fixDate(j, input.prompt) : mockGoalMap(input);
  }
  const today = new Date().toISOString().slice(0, 10);
  const r = await generateJson<GoalMapResult>(SYSTEM, `Today's date: ${today}\nGoal: ${input.prompt}`);
  return valid(r) ? fixDate(r, input.prompt) : mockGoalMap(input);
}
