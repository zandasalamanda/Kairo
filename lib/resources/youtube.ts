import "server-only";
import type { ResolvedResource } from "@/types";
import { isObj } from "@/lib/ai/provider";

// Resolve a search query to a REAL YouTube video via the Data API. The model
// only ever produced the query — the URL comes back from YouTube, so it can't
// be hallucinated. Returns null with no key or no result (caller falls back to
// a live search link, i.e. today's behavior — never a dead link).

const KEY = () => process.env.YOUTUBE_API_KEY || "";

export function youtubeConfigured(): boolean {
  return !!KEY();
}

export async function searchYouTube(query: string): Promise<ResolvedResource | null> {
  const key = KEY();
  if (!key || !query.trim()) return null;
  const url =
    "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&safeSearch=moderate&relevanceLanguage=en" +
    `&q=${encodeURIComponent(query)}&key=${key}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const items = isObj(data) && Array.isArray(data.items) ? data.items : [];
    for (const it of items) {
      if (!isObj(it)) continue;
      const id = isObj(it.id) ? it.id.videoId : null;
      const sn = isObj(it.snippet) ? it.snippet : null;
      if (typeof id !== "string" || !id || !sn) continue;
      // Skip live broadcasts — they end and rot; we want durable content.
      if (sn.liveBroadcastContent && sn.liveBroadcastContent !== "none") continue;
      const thumbs = isObj(sn.thumbnails) ? sn.thumbnails : null;
      const medium = thumbs && isObj(thumbs.medium) ? thumbs.medium : null;
      return {
        url: `https://www.youtube.com/watch?v=${id}`,
        title: decode(String(sn.title ?? "").trim()) || "Watch on YouTube",
        source: decode(String(sn.channelTitle ?? "").trim()) || "YouTube",
        thumbnail: medium && typeof medium.url === "string" ? medium.url : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// YouTube snippet text is HTML-escaped (e.g. &amp;, &#39;).
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
