import "server-only";
import type { ResolvedResource } from "@/types";
import { isObj } from "@/lib/ai/provider";

// Resolve a "read" step's search intent to ONE real page via Gemini's Google
// Search grounding. The URL comes from groundingMetadata (a real Google result,
// not model-invented), so it can't be hallucinated. Returns null with no key or
// no result — the caller then falls back to a live search link (never a dead one).

const NATIVE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.AI_RESEARCH_MODEL || process.env.AI_MODEL || "gemini-3.1-flash-lite";
const apiKey = () => process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "";

// Grounding is model-ELECTED: if the prompt can be answered from memory the model
// won't search, and with no search there's no groundingMetadata and no URL. Asking
// only for "a short title" was answerable without searching, so it never grounded.
// Demand a current page and an explicit search.
const SYSTEM =
  "Search the web to find the single best, most authoritative page a person should open right now to do this. " +
  "You must use the search tool — never answer from memory. " +
  "Then reply with just a short, plain title for that page (a few words). Do not paste the URL.";

export async function resolveArticle(query: string): Promise<ResolvedResource | null> {
  const key = apiKey();
  if (!key || !query.trim()) return null;
  try {
    const res = await fetch(`${NATIVE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ parts: [{ text: `Search the web for the best current page to read for: ${query}` }] }],
        tools: [{ google_search: {} }],
      }),
      // A grounded search routinely runs past 8s; that timeout was aborting real results.
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      // Silence here made a 429 (grounding quota) look identical to "no result".
      console.warn("[resolveArticle] grounded search failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data: unknown = await res.json();
    const cand = isObj(data) && Array.isArray(data.candidates) ? data.candidates[0] : null;
    const content = isObj(cand) && isObj(cand.content) ? cand.content : null;
    const parts = content && Array.isArray(content.parts) ? content.parts : [];
    const answer = parts.map((p) => (isObj(p) && typeof p.text === "string" ? p.text : "")).join("").trim();

    const gm = isObj(cand) && isObj(cand.groundingMetadata) ? cand.groundingMetadata : null;
    const chunks = gm && Array.isArray(gm.groundingChunks) ? gm.groundingChunks : [];
    for (const c of chunks) {
      const web = isObj(c) && isObj(c.web) ? c.web : null;
      const raw = web && typeof web.uri === "string" ? web.uri : "";
      if (!raw) continue;
      // Grounding hands back a vertexaisearch redirect, not the publisher. Follow
      // it server-side so the user opens the real article, not a Google bounce.
      const url = await publisherUrl(raw);
      const site = web && typeof web.title === "string" ? web.title.trim() : "";
      const title = (answer || site || "Open the best result").slice(0, 140);
      const source = site && site.toLowerCase() !== title.toLowerCase() ? site : domainOf(url) || "the web";
      return { url, title, source, thumbnail: null };
    }
    return null;
  } catch (err) {
    console.warn("[resolveArticle] threw", err);
    return null;
  }
}

/** Follow a Google grounding redirect to the page it actually points at. */
async function publisherUrl(url: string): Promise<string> {
  if (!/vertexaisearch|googleusercontent/.test(url)) return url;
  try {
    const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    return r.url || url;
  } catch {
    return url; // the redirect still works in the browser
  }
}

// Bare hostname, minus the Google grounding-redirect hosts (which aren't the publisher).
function domainOf(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return /vertexaisearch|googleusercontent|(^|\.)google\.com$/.test(h) ? "" : h;
  } catch {
    return "";
  }
}
