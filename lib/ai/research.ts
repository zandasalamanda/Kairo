import { isObj, isClient, viaRouteResult, raiseIfBlocked } from "./provider";
import type { ResearchInput, ResearchResult } from "./types";

// Grounded research (Pro): calls Gemini's NATIVE endpoint with Google Search
// grounding so the answer is current and carries real, cited sources — unlike
// the ungrounded generateJson calls. Sources come from groundingMetadata.

const NATIVE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.AI_RESEARCH_MODEL || process.env.AI_MODEL || "gemini-3.1-flash-lite";
const apiKey = () => process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "";

const SYSTEM = `You are Sola, doing focused research for the user. The user is working on ONE step of a goal and needs current, factual, sourced information to do it well. Answer in clean, well-structured markdown: a direct, specific answer with concrete numbers and specifics, organized under short headings or bullets. Include a diagram in a fenced code block tagged mermaid ONLY when a process or comparison genuinely helps. Be practical and honest — no padding, no disclaimers. Do NOT paste raw URLs inline; the sources are shown separately.`;

async function runResearch(input: ResearchInput): Promise<ResearchResult> {
  const key = apiKey();
  if (!key) return { answer: "Research is unavailable right now.", sources: [] };
  const prompt = `Goal: ${input.goalTitle}\nStep: ${input.nodeTitle}${input.context ? `\nContext: ${input.context}` : ""}${
    input.question ? `\nSpecifically: ${input.question}` : "\nResearch exactly what they need to know to do this step well, with current specifics."
  }`;
  try {
    const res = await fetch(`${NATIVE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    });
    if (!res.ok) {
      console.error("[research] http", res.status);
      return { answer: "Couldn't complete the research just now — try again in a moment.", sources: [] };
    }
    const data: unknown = await res.json();
    const cand = isObj(data) && Array.isArray(data.candidates) ? data.candidates[0] : null;
    const content = isObj(cand) && isObj(cand.content) ? cand.content : null;
    const parts = content && Array.isArray(content.parts) ? content.parts : [];
    const answer = parts.map((p) => (isObj(p) && typeof p.text === "string" ? p.text : "")).join("").trim();

    const gm = isObj(cand) && isObj(cand.groundingMetadata) ? cand.groundingMetadata : null;
    const chunks = gm && Array.isArray(gm.groundingChunks) ? gm.groundingChunks : [];
    const sources: { title: string; url: string }[] = [];
    const seen = new Set<string>();
    for (const c of chunks) {
      const web = isObj(c) && isObj(c.web) ? c.web : null;
      const url = web && typeof web.uri === "string" ? web.uri : "";
      const title = web && typeof web.title === "string" ? web.title : url;
      if (url && !seen.has(url)) {
        seen.add(url);
        sources.push({ title: title.slice(0, 140), url });
      }
    }
    if (!answer) return { answer: "Couldn't find a clear answer — try rephrasing your question.", sources };
    return { answer, sources: sources.slice(0, 8) };
  } catch (e) {
    console.error("[research]", e instanceof Error ? e.message : e);
    return { answer: "Couldn't reach research just now — try again.", sources: [] };
  }
}

export async function research(input: ResearchInput): Promise<ResearchResult> {
  if (isClient()) {
    const res = await viaRouteResult<ResearchResult>("/api/ai/research", input);
    raiseIfBlocked(res);
    if (res.data && typeof res.data.answer === "string") {
      return { answer: res.data.answer, sources: Array.isArray(res.data.sources) ? res.data.sources : [] };
    }
    return { answer: "Couldn't complete the research just now — try again.", sources: [] };
  }
  return runResearch(input);
}
