import "server-only";
import type { ResolvedResource, ResourceKind } from "@/types";
import { searchYouTube } from "./youtube";

// Turn a step's search intent into a real, live link. Video-kind steps go to the
// YouTube Data API; "read" stays a search intent for now (returns null → caller
// keeps today's search link). A small in-memory cache keeps identical queries
// from re-spending quota within a warm server instance; the node-level cache in
// the DB makes it durable across instances.

const cache = new Map<string, ResolvedResource | null>();
const norm = (kind: ResourceKind, q: string) => `${kind}:${q.trim().toLowerCase()}`;

export async function resolveResource(kind: ResourceKind, query: string): Promise<ResolvedResource | null> {
  if (kind === "read") return null; // web-search grounding is a later pass
  const k = norm(kind, query);
  if (cache.has(k)) return cache.get(k) ?? null;
  const r = await searchYouTube(query);
  cache.set(k, r);
  return r;
}
