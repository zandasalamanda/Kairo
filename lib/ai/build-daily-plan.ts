import { generateJson, isObj, isClient, viaRoute } from "./provider";
import { mockDailyPlan } from "./mock";
import type { DailyPlanInput, DailyPlanResult } from "./types";

const SYSTEM = `You are Kairo, building the most efficient plan for TODAY from a user's goals, available time, and energy.
Return JSON: {"summary":string,"blocks":[{"title":string,"description":string,"goalId":string|null,"nodeId":string|null,"durationMinutes":number,"startTime":null,"difficulty":"light"|"moderate"|"deep","reason":string}],"explanation":string,"recoveryNote":string|null}.
Rules: total durationMinutes must not exceed the available time; always set startTime to null (no calendar); prefer in-motion and at-risk nodes; scale block length and difficulty to energy; recoveryNote is non-null only if a node is at risk. Practical and concise.`;

function valid(r: unknown): r is DailyPlanResult {
  return isObj(r) && typeof r.summary === "string" && Array.isArray(r.blocks);
}

export async function buildDailyPlan(input: DailyPlanInput): Promise<DailyPlanResult> {
  if (isClient()) {
    const j = await viaRoute<DailyPlanResult>("/api/ai/daily-plan", input);
    return valid(j) ? j : mockDailyPlan(input);
  }
  const nodes = input.goals.flatMap((g) =>
    g.nodes.filter((n) => n.status !== "done" && n.status !== "blocked").map((n) => ({ goalId: g.id, goalTitle: g.title, nodeId: n.id, title: n.title, status: n.status, priority: n.priority, estimatedMinutes: n.estimatedMinutes, aiReason: n.aiReason }))
  );
  const user = `Available minutes: ${input.availableMinutes}\nEnergy: ${input.energy}\nContext: ${input.context || "(none)"}\nWorkable nodes: ${JSON.stringify(nodes)}`;
  const r = await generateJson<DailyPlanResult>(SYSTEM, user);
  return valid(r) ? r : mockDailyPlan(input);
}
