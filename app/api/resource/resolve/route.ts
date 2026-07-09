import { NextResponse } from "next/server";
import { resolveResource } from "@/lib/resources/resolve";
import { guardAi, clampText } from "@/lib/ai/guard";
import type { ResourceKind } from "@/types";

const KINDS: ResourceKind[] = ["watch", "practice", "read"];

export async function POST(req: Request) {
  // Video resolution is available on all plans (YouTube Data API is free-quota);
  // still rate-limited via guardAi so it counts toward the AI budget.
  const denied = await guardAi();
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const kind = KINDS.includes(b.kind as ResourceKind) ? (b.kind as ResourceKind) : "watch";
  const resolved = await resolveResource(kind, clampText(b.query, 200));
  return NextResponse.json({ resolved });
}
