import { generateJson, isObj, isClient, viaRoute } from "./provider";
import type { WorkSessionInput, WorkSessionResult, UnblockInput, UnblockResult } from "./types";

// The Working Session: Aether sits down with the user on ONE step and helps them
// actually start it — a first move that kills hesitation, plus a short checklist
// sized to the session. One call, made when the user opens a focus session.

const PLAN_SYSTEM = `You are Aether, an execution coach sitting down with someone for ONE short work session on a single step of their goal.
First decide the step's kind:
- "desk" — thinking/creating/planning work at a screen or on paper (writing, outlining, researching, designing, budgeting, messaging).
- "coach" — physical or in-the-world work you cannot do for them (training, practising an instrument, cooking, a workout, a hard conversation, an errand).
Return JSON: {"kind":"desk"|"coach","firstMove":string,"steps":[string,...]}.
"firstMove" is the single smallest physical action to begin RIGHT NOW — concrete enough to remove all hesitation (e.g. "Open a blank doc, title it 'Ch.1'", "Set 4 cones 5 yards apart"). Max 12 words.
"steps" is an ORDERED checklist of 2-4 micro-actions that fit inside the session length. Each max 10 words, imperative, specific to THIS step. No filler, no warm-ups unless the step is physical.`;

function validPlan(r: unknown): r is WorkSessionResult {
  return isObj(r) && typeof r.firstMove === "string" && Array.isArray(r.steps);
}

function cleanPlan(r: WorkSessionResult): WorkSessionResult {
  return {
    kind: r.kind === "desk" ? "desk" : "coach",
    firstMove: String(r.firstMove).trim().slice(0, 120),
    steps: (r.steps || [])
      .filter((s) => typeof s === "string" && s.trim())
      .map((s) => String(s).trim().slice(0, 90))
      .slice(0, 4),
  };
}

function fallbackPlan(input: WorkSessionInput): WorkSessionResult {
  const t = input.nodeTitle.replace(/[.?!]+$/, "");
  return {
    kind: "coach",
    firstMove: "Clear your space and start the timer.",
    steps: [
      `Turn "${t}" into one physical first action`,
      "Do that action — ignore everything else",
      "Note where you stopped for next time",
    ],
  };
}

/** Plan a focus session on one step: kind + first move + a short checklist. */
export async function planSession(input: WorkSessionInput): Promise<WorkSessionResult> {
  if (isClient()) {
    const j = await viaRoute<WorkSessionResult>("/api/ai/work-session", input);
    return validPlan(j) ? cleanPlan(j) : fallbackPlan(input);
  }
  const r = await generateJson<WorkSessionResult>(
    PLAN_SYSTEM,
    `Goal: ${input.goalTitle}\nStep: ${input.nodeTitle}\nDetail: ${input.nodeDescription || "(none)"}\nSession length: ${input.minutes} minutes${input.context ? `\nWhat they've told you: ${input.context}` : ""}`
  );
  return validPlan(r) && r.steps.length > 0 ? cleanPlan(r) : fallbackPlan(input);
}

// "Stuck?" — the coach when you freeze. One call: shrink the step, name the
// blocker, or explain the missing idea, and always end with the next action.

const UNBLOCK_SYSTEM = `You are Aether, a sharp execution coach. The user is stuck on a step and can't start. In 2-4 sentences do ONE of: break it into a smaller first action, name exactly what's blocking them, or explain the one concept they're missing. End with the precise next physical action. No hedging, no disclaimers, no "as an AI". Return JSON: {"answer":string}.`;
const UNBLOCK_FALLBACK =
  "Shrink it: what's the smallest version you could finish in five minutes? Do only that — the rest gets obvious once you've started.";

function validUnblock(r: unknown): r is UnblockResult {
  return isObj(r) && typeof r.answer === "string";
}

export async function unblock(input: UnblockInput): Promise<UnblockResult> {
  if (isClient()) {
    const j = await viaRoute<UnblockResult>("/api/ai/unblock", input);
    return validUnblock(j) ? j : { answer: UNBLOCK_FALLBACK };
  }
  const r = await generateJson<UnblockResult>(
    UNBLOCK_SYSTEM,
    `Goal: ${input.goalTitle}\nStuck on: ${input.nodeTitle}${input.context ? `\nContext: ${input.context}` : ""}`
  );
  return validUnblock(r) ? r : { answer: UNBLOCK_FALLBACK };
}
