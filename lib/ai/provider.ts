import { features } from "@/lib/config";

// Provider-agnostic AI adapter over the OpenAI-compatible Chat Completions API.
// Works with any such endpoint by setting AI_BASE_URL + AI_MODEL + AI_API_KEY:
//   Gemini (default):  https://generativelanguage.googleapis.com/v1beta/openai  ·  gemini-flash-lite-latest
//   DeepSeek:          https://api.deepseek.com                                 ·  deepseek-chat
//   OpenAI:            https://api.openai.com/v1                                ·  gpt-4.1-mini
//   Groq / OpenRouter / Together: their base URL + model
// Every caller falls back to a deterministic mock when this returns null, so the
// app is fully usable with no key and safe even if a response is malformed.

const BASE = (process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, "");
const MODEL = process.env.AI_MODEL || "gemini-flash-lite-latest";
const apiKey = () => process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "";

export function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export const isClient = () => typeof window !== "undefined";

export interface RouteResult<T> { data: T | null; status: number; error?: string; upgrade?: boolean }

/** Browser → server route (key stays server-side), preserving the HTTP status so
 *  callers can tell a rate-limit / upgrade / outage apart from a valid empty result. */
export async function viaRouteResult<T>(path: string, input: unknown): Promise<RouteResult<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) return { data: (await res.json()) as T, status: res.status };
    let error: string | undefined;
    let upgrade: boolean | undefined;
    try {
      const b: unknown = await res.json();
      if (isObj(b)) {
        if (typeof b.error === "string") error = b.error;
        if (typeof b.upgrade === "boolean") upgrade = b.upgrade;
      }
    } catch {
      /* non-JSON error body */
    }
    return { data: null, status: res.status, error, upgrade };
  } catch {
    return { data: null, status: 0 };
  }
}

/** From the browser, run an AI task through its server route (key stays server-side). */
export async function viaRoute<T>(path: string, input: unknown): Promise<T | null> {
  return (await viaRouteResult<T>(path, input)).data;
}

/** A human message for a failed AI route, tuned to the status (limit / upgrade / outage). */
export function aiErrorText(r: { status: number; error?: string }): string {
  if (r.status === 401) return "Please sign in to use Solaspace's AI.";
  if (r.status === 402) return r.error || "That's a Pro feature — upgrade in Settings → Billing to unlock it.";
  if (r.status === 429) return r.error || "You've reached today's AI limit — it resets soon.";
  if (r.status === 0) return "You seem to be offline — check your connection and try again.";
  return r.error || "Sola couldn't respond just now — it may be busy. Try again in a moment.";
}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

/** Ask the model for JSON matching a shape. Returns null on any failure. */
export async function generateJson<T>(system: string, user: string): Promise<T | null> {
  if (!features.ai || !apiKey()) return null;
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 1600,
        messages: [
          { role: "system", content: `${system}\n\nReturn ONLY a valid minified JSON object — no surrounding prose and no code fences around the JSON. String values inside it may contain rich markdown: headings, bullet and numbered lists, tables, and fenced code blocks (including diagrams tagged mermaid).` },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const choice = isObj(data) && Array.isArray(data.choices) ? data.choices[0] : null;
    const message = isObj(choice) && isObj(choice.message) ? choice.message : null;
    const text = message ? String(message.content ?? "") : "";
    return extractJson(text) as T | null;
  } catch {
    return null;
  }
}
