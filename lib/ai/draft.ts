import { generateJson, isObj, isClient, viaRoute } from "./provider";
import type { DraftInput, DraftResult } from "./types";

// Co-produced artifacts: for a desk step, Aether writes a real first draft of
// whatever the step calls for — a cover letter, an outline, a study plan, a
// message — from the user's own context. They edit it and keep it in the notebook.

const SYSTEM = `You are Aether, co-writing with the user on ONE step of their goal. Produce a real, usable first draft of whatever this step calls for — a cover letter, an outline, a study plan, a message, a meal plan, a checklist — using their context. Write the actual artifact, not advice about it, and not a description of what you'd write. Keep it tight and immediately editable. Return JSON: {"title":string,"content":string}. "title" is a 2-4 word label (e.g. "Cover letter draft"). "content" is the draft itself as plain text with line breaks — no preamble like "Here's a draft:", no sign-off from you.`;

const FALLBACK: DraftResult = {
  title: "Starter draft",
  content:
    "Add an AI key and Aether will co-write a real first draft here. For now, write your own rough first pass — even one messy paragraph beats a blank page.",
};

function valid(r: unknown): r is DraftResult {
  return isObj(r) && typeof r.title === "string" && typeof r.content === "string" && r.content.trim().length > 0;
}

/** Draft a real artifact for a desk step, from the user's context. */
export async function draftForStep(input: DraftInput): Promise<DraftResult> {
  if (isClient()) {
    const j = await viaRoute<DraftResult>("/api/ai/draft", input);
    return valid(j) ? { title: j.title.slice(0, 48), content: j.content.slice(0, 6000) } : FALLBACK;
  }
  const r = await generateJson<DraftResult>(
    SYSTEM,
    `Goal: ${input.goalTitle}\nStep: ${input.nodeTitle}\nDetail: ${input.nodeDescription || "(none)"}${input.context ? `\nTheir context: ${input.context}` : ""}${input.instruction ? `\nExtra instruction: ${input.instruction}` : ""}`
  );
  return valid(r) ? { title: String(r.title).trim().slice(0, 48), content: String(r.content).trim().slice(0, 6000) } : FALLBACK;
}
