import { generateJson, isObj, isClient, viaRoute, viaRouteResult, aiErrorText } from "./provider";
import type { ExpandNodeInput, ExpandNodeResult, AskNodeInput, AskNodeResult } from "./types";

// Two small, user-initiated AI helpers on a single step of a plan:
// "go deeper" (break a step into concrete sub-steps) and "ask a question".

const EXPAND_SYSTEM = `You are Solaspace. Break ONE step of a plan into 2-4 concrete, do-this-now sub-steps the user can follow with zero further thinking. Return JSON: {"steps":[{"title":string,"estimatedMinutes":number,"aiReason":string}]}. Each title is imperative and specific — a single sitting of work, in the order it should be done. estimatedMinutes is realistic (10-90). "aiReason" is a short phrase. No fluff.`;

const ASK_SYSTEM = `You are Solaspace, a sharp, direct execution coach. Answer the user's question about a specific step thoroughly and practically, in clean markdown: a direct answer first, then the concrete how as short numbered steps or bullets, and end with the exact next action. Use a table when comparing options, and include a diagram in a fenced code block tagged mermaid ONLY when a process or structure genuinely makes it clearer. No fluff, no hedging, no disclaimers. Return JSON: {"answer":string} where "answer" is the markdown.`;

const ASK_FALLBACK = "Break this into the smallest possible first action and start there — momentum makes the rest obvious.";

function validExpand(r: unknown): r is ExpandNodeResult {
  return isObj(r) && Array.isArray(r.steps);
}
function validAsk(r: unknown): r is AskNodeResult {
  return isObj(r) && typeof r.answer === "string";
}

function fallbackExpand(input: ExpandNodeInput): ExpandNodeResult {
  const t = input.nodeTitle.replace(/[.?!]+$/, "").toLowerCase();
  return {
    steps: [
      { title: `Outline what "${input.nodeTitle}" needs`, estimatedMinutes: 15, aiReason: "Get clear before doing" },
      { title: `Do the core of ${t}`, estimatedMinutes: 45, aiReason: "The part that actually matters" },
      { title: `Check ${t} is done right`, estimatedMinutes: 15, aiReason: "Catch gaps before moving on" },
    ],
  };
}

/** Clamp the model's steps to something sane (≤4 steps, realistic minutes). */
function cleanExpand(r: ExpandNodeResult): ExpandNodeResult {
  const steps = r.steps
    .filter((s) => s && typeof s.title === "string" && s.title.trim())
    .slice(0, 4)
    .map((s) => ({
      title: String(s.title).trim(),
      estimatedMinutes: Math.min(120, Math.max(10, Math.round(Number(s.estimatedMinutes) || 30))),
      aiReason: typeof s.aiReason === "string" ? s.aiReason : "",
    }));
  return { steps };
}

export async function expandNode(input: ExpandNodeInput): Promise<ExpandNodeResult> {
  if (isClient()) {
    const j = await viaRoute<ExpandNodeResult>("/api/ai/expand-node", input);
    return validExpand(j) ? cleanExpand(j) : fallbackExpand(input);
  }
  const r = await generateJson<ExpandNodeResult>(
    EXPAND_SYSTEM,
    `Goal: ${input.goalTitle}\nStep to break down: ${input.nodeTitle}\nStep detail: ${input.nodeDescription || "(none)"}${input.context ? `\nPersonalize for: ${input.context}` : ""}`
  );
  return validExpand(r) && r.steps.length > 0 ? cleanExpand(r) : fallbackExpand(input);
}

export async function askNode(input: AskNodeInput): Promise<AskNodeResult> {
  if (isClient()) {
    const res = await viaRouteResult<AskNodeResult>("/api/ai/ask-node", input);
    if (validAsk(res.data)) return res.data;
    return { answer: res.status === 402 || res.status === 429 ? aiErrorText(res) : ASK_FALLBACK };
  }
  const r = await generateJson<AskNodeResult>(
    ASK_SYSTEM,
    `Goal: ${input.goalTitle}\nStep: ${input.nodeTitle}${input.context ? `\nWhat they've told you: ${input.context}` : ""}\nQuestion: ${input.question}`
  );
  return validAsk(r) ? r : { answer: ASK_FALLBACK };
}
