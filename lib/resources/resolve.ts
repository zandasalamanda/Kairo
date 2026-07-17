import "server-only";
import type { ResolvedResource, ResourceKind } from "@/types";
import { searchYouTube } from "./youtube";
import { resolveArticle } from "./web";

// Turn a step's search intent into a real, live link: video-kind steps go to the
// YouTube Data API, "read" steps to Gemini's Google Search grounding. Both return
// a real URL or null (caller then keeps today's search link — never a dead link).
// A small in-memory cache keeps identical queries from re-spending quota within a
// warm server instance; the node-level DB cache makes it durable across instances.

const cache = new Map<string, ResolvedResource | null>();
const norm = (kind: ResourceKind, q: string) => `${kind}:${q.trim().toLowerCase()}`;

export async function resolveResource(kind: ResourceKind, query: string): Promise<ResolvedResource | null> {
  const k = norm(kind, query);
  const hit = cache.get(k);
  if (hit) return hit;
  const r = kind === "read" ? await resolveArticle(query) : await searchYouTube(query);
  // Only cache SUCCESS. Caching null meant one transient failure (a 429, a
  // timeout, a missing key) poisoned that query for the life of the instance, so
  // the step kept showing a search link long after the cause was fixed.
  if (r) cache.set(k, r);
  return r;
}
