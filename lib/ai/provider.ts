import { features } from "@/lib/config";

// Real AI adapter (Anthropic Messages API via fetch — no SDK dependency).
// Every caller falls back to a deterministic mock when this returns null, so
// the app is fully usable with no key and safe even if a response is malformed.

const MODEL = process.env.AI_MODEL || "claude-sonnet-5";
const apiKey = () => process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || "";

export function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export const isClient = () => typeof window !== "undefined";

/** From the browser, run an AI task through its server route (key stays server-side). */
export async function viaRoute<T>(path: string, input: unknown): Promise<T | null> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1600,
        system: `${system}\n\nRespond with ONLY valid minified JSON — no prose, no markdown code fences.`,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const text = isObj(data) && Array.isArray(data.content) && isObj(data.content[0]) ? String(data.content[0].text ?? "") : "";
    return extractJson(text) as T | null;
  } catch {
    return null;
  }
}
