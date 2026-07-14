import { generateJson, isObj, isClient, viaRouteResult, raiseIfBlocked } from "./provider";
import type { ExpandNodeInput, ExpandNodeResult, AskNodeInput, AskNodeResult } from "./types";

// Two small, user-initiated AI helpers on a single step of a plan:
// "go deeper" (break a step into concrete sub-steps) and "ask a question".

const EXPAND_SYSTEM = `You are Sola. Break ONE step of a plan into 2-4 concrete, do-this-now sub-steps the user can follow with zero further thinking. Return JSON: {"steps":[{"title":string,"estimatedMinutes":number,"aiReason":string}]}. Each title is imperative and specific — a single sitting of work, in the order it should be done. estimatedMinutes is realistic (10-90). "aiReason" is a short phrase. No fluff.`;

// "Make it smaller" — kill activation energy (Fogg / Goblin Tools): the FIRST step
// should be so tiny it's almost silly, so an overwhelmed user can just start.
const TINY_EXPAND_SYSTEM = `You are Sola helping someone who feels stuck START. Break ONE step into 5-6 TINY, sequential micro-steps — each so small it's almost silly (5-15 minutes), removing every excuse not to begin. The FIRST micro-step must be a 2-5 minute "just open it / just look" action. Return JSON: {"steps":[{"title":string,"estimatedMinutes":number,"aiReason":string}]}. Titles are imperative and concrete ("Open a blank doc and title it", not "Prepare"). estimatedMinutes 5-15. "aiReason" is a short phrase. No fluff.`;

const ASK_SYSTEM = `You are Sola, a sharp, direct execution coach. Answer the user's question about a specific step thoroughly and practically, in clean markdown: a direct answer first, then the concrete how as short numbered steps or bullets, and end with the exact next action. Use a table when comparing options, and include a diagram in a fenced code block tagged mermaid ONLY when a process or structure genuinely makes it clearer. No fluff, no hedging, no disclaimers. Return JSON: {"answer":string} where "answer" is the markdown.`;

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

/** Clamp the model's steps to something sane. Tiny mode allows more, smaller steps. */
function cleanExpand(r: ExpandNodeResult, tiny = false): ExpandNodeResult {
  const steps = r.steps
    .filter((s) => s && typeof s.title === "string" && s.title.trim())
    .slice(0, tiny ? 6 : 4)
    .map((s) => ({
      title: String(s.title).trim(),
      estimatedMinutes: Math.min(tiny ? 20 : 120, Math.max(tiny ? 5 : 10, Math.round(Number(s.estimatedMinutes) || (tiny ? 10 : 30)))),
      aiReason: typeof s.aiReason === "string" ? s.aiReason : "",
    }));
  return { steps };
}

export async function expandNode(input: ExpandNodeInput): Promise<ExpandNodeResult> {
  if (isClient()) {
    // Surface rate-limit / upgrade responses (like askNode) instead of silently
    // injecting generic filler steps and claiming success.
    const res = await viaRouteResult<ExpandNodeResult>("/api/ai/expand-node", input);
    raiseIfBlocked(res);
    return validExpand(res.data) ? cleanExpand(res.data, input.tiny) : fallbackExpand(input);
  }
  const r = await generateJson<ExpandNodeResult>(
    input.tiny ? TINY_EXPAND_SYSTEM : EXPAND_SYSTEM,
    `Goal: ${input.goalTitle}\nStep to break down: ${input.nodeTitle}\nStep detail: ${input.nodeDescription || "(none)"}${input.context ? `\nPersonalize for: ${input.context}` : ""}`
  );
  return validExpand(r) && r.steps.length > 0 ? cleanExpand(r, input.tiny) : fallbackExpand(input);
}

export async function askNode(input: AskNodeInput): Promise<AskNodeResult> {
  if (isClient()) {
    const res = await viaRouteResult<AskNodeResult>("/api/ai/ask-node", input);
    raiseIfBlocked(res);
    if (validAsk(res.data)) return res.data;
    return { answer: ASK_FALLBACK };
  }
  const r = await generateJson<AskNodeResult>(
    ASK_SYSTEM,
    `Goal: ${input.goalTitle}\nStep: ${input.nodeTitle}${input.context ? `\nWhat they've told you: ${input.context}` : ""}\nQuestion: ${input.question}`
  );
  return validAsk(r) ? r : { answer: ASK_FALLBACK };
}
