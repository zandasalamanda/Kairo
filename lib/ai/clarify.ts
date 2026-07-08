import { generateJson, isObj, isClient, viaRoute } from "./provider";
import { clarifiersFor } from "./clarifiers";
import type { Clarifier } from "./types";

// A tiny questions-only AI call: given a goal, return the 2-3 sharp, tailored
// questions a coach would ask — asked BEFORE the plan is generated, so the whole
// flow is one small call + one plan call (no regenerating the tree twice).

const SYSTEM = `You are Solaspace, an execution coach. Given a user's goal, return the 2-3 SHORT questions a sharp coach would ask to make a plan for it concrete and personal — the specifics that materially change the steps or the numbers.
Return JSON: {"clarifiers":[{"question":string,"options":string[]}]}.
Rules: do NOT ask about the deadline or timeframe (that's asked separately). Use ranges as options where a number is needed (e.g. income "<$2k","$2-4k","$4-7k","$7k+"; savings "$100/mo","$300/mo","$500/mo+"). Make them specific to THIS goal (e.g. a savings goal → item price + monthly amount; climbing → current grade + focus; an instrument → level + practice time). Question ≤5 words, each option ≤4 words, 2-4 options each.`;

const DEADLINE: Clarifier = { question: "Deadline?", options: ["1 month", "3 months", "6 months", "1 year", "2+ years"] };
const DEADLINE_RE = /deadline|time ?frame|by when|due|timeline|how long/i;

function clean(cs: unknown): Clarifier[] {
  if (!Array.isArray(cs)) return [];
  return cs
    .filter(isObj)
    .map((c) => ({
      question: String(c.question ?? "").trim().slice(0, 50),
      options: Array.isArray(c.options) ? c.options.map((o) => String(o).trim().slice(0, 24)).filter(Boolean).slice(0, 4) : [],
    }))
    .filter((c) => c.question && c.options.length >= 2 && !DEADLINE_RE.test(c.question));
}

/** Deadline (hardcoded, first) + up to two AI-tailored questions; local fallback on any failure. */
export async function clarifyGoal(prompt: string): Promise<Clarifier[]> {
  if (isClient()) {
    const j = await viaRoute<{ clarifiers: Clarifier[] }>("/api/ai/clarify", { prompt });
    const ai = j ? clean(j.clarifiers) : [];
    return ai.length ? [DEADLINE, ...ai].slice(0, 3) : clarifiersFor(prompt);
  }
  const r = await generateJson<{ clarifiers: Clarifier[] }>(SYSTEM, `Goal: ${prompt}`);
  const ai = r ? clean(r.clarifiers) : [];
  return ai.length ? [DEADLINE, ...ai].slice(0, 3) : clarifiersFor(prompt);
}
