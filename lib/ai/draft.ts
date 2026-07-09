import { generateJson, isObj, isClient, viaRouteResult, aiErrorText } from "./provider";
import type { DraftInput, DraftResult } from "./types";

// Co-produced artifacts: for a desk step, Solaspace writes a real first draft of
// whatever the step calls for — a cover letter, an outline, a study plan, a
// message — from the user's own context. They edit it and keep it in the notebook.

const SYSTEM = `You are Solaspace, co-writing with the user on ONE step of their goal. Produce a real, usable first draft of whatever this step calls for — a cover letter, an outline, a study plan, a message, a meal plan, a checklist — using their context. Write the actual artifact, not advice about it, and not a description of what you'd write. Keep it tight and immediately editable. Return JSON: {"title":string,"content":string}. "title" is a 2-4 word label (e.g. "Cover letter draft"). "content" is the draft itself as plain text with line breaks — no preamble like "Here's a draft:", no sign-off from you.`;

const FALLBACK: DraftResult = {
  title: "Starter draft",
  content:
    "Sola couldn't draft this just now. Write your own rough first pass — even one messy paragraph beats a blank page.",
};

function valid(r: unknown): r is DraftResult {
  return isObj(r) && typeof r.title === "string" && typeof r.content === "string" && r.content.trim().length > 0;
}

/** Draft a real artifact for a desk step, from the user's context. */
export async function draftForStep(input: DraftInput): Promise<DraftResult> {
  if (isClient()) {
    const res = await viaRouteResult<DraftResult>("/api/ai/draft", input);
    if (valid(res.data)) return { title: res.data.title.slice(0, 48), content: res.data.content.slice(0, 6000) };
    return res.status === 402 || res.status === 429 ? { title: "Sola is at its limit", content: aiErrorText(res) } : FALLBACK;
  }
  const r = await generateJson<DraftResult>(
    SYSTEM,
    `Goal: ${input.goalTitle}\nStep: ${input.nodeTitle}\nDetail: ${input.nodeDescription || "(none)"}${input.context ? `\nTheir context: ${input.context}` : ""}${input.instruction ? `\nExtra instruction: ${input.instruction}` : ""}`
  );
  return valid(r) ? { title: String(r.title).trim().slice(0, 48), content: String(r.content).trim().slice(0, 6000) } : FALLBACK;
}
