import { generateJson, isObj, isClient, viaRoute } from "./provider";
import type { ExtractStepsInput, ExtractStepsResult } from "./types";

// Notebook → map: turn a messy brain-dump into concrete steps the user can add
// to their plan. One user-initiated call; deterministic fallback with no key.

const SYSTEM = `You are Sola. Turn a user's messy notes about a goal into concrete, do-able action steps to add to their plan. Return JSON: {"steps":[string,...]}. Each step is imperative, specific, one sitting of work, <=10 words. Extract only real actions implied by the notes — skip stray thoughts, feelings, or facts that aren't tasks. Return 2-6 steps (fewer if the notes are thin), no duplicates, no fluff.`;

function valid(r: unknown): r is ExtractStepsResult {
  return isObj(r) && Array.isArray(r.steps);
}

function clean(r: ExtractStepsResult): ExtractStepsResult {
  const seen = new Set<string>();
  const steps = r.steps
    .filter((s) => typeof s === "string")
    .map((s) => s.trim().replace(/^[-*•\d.)\s]+/, "").slice(0, 90))
    .filter((s) => {
      const k = s.toLowerCase();
      if (s.length < 3 || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 6);
  return { steps };
}

/** Local fallback: pull task-like lines straight from the notes. */
function fallback(notes: string): ExtractStepsResult {
  const steps = notes
    .split(/\n|(?<=\.)\s+/)
    .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, ""))
    .filter((l) => l.length >= 3 && l.length <= 90)
    .slice(0, 6);
  return clean({ steps });
}

export async function extractSteps(input: ExtractStepsInput): Promise<ExtractStepsResult> {
  if (!input.notes.trim()) return { steps: [] };
  if (isClient()) {
    const j = await viaRoute<ExtractStepsResult>("/api/ai/extract-steps", input);
    return valid(j) && j.steps.length ? clean(j) : fallback(input.notes);
  }
  const r = await generateJson<ExtractStepsResult>(SYSTEM, `Goal: ${input.goalTitle}\nNotes:\n${input.notes}`);
  return valid(r) && r.steps.length ? clean(r) : fallback(input.notes);
}
