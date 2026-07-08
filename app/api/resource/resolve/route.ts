import { NextResponse } from "next/server";
import { resolveResource } from "@/lib/resources/resolve";
import { guardAi, clampText } from "@/lib/ai/guard";
import type { ResourceKind } from "@/types";

const KINDS: ResourceKind[] = ["watch", "practice", "read"];

export async function POST(req: Request) {
  const denied = await guardAi({ pro: true });
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const kind = KINDS.includes(b.kind as ResourceKind) ? (b.kind as ResourceKind) : "watch";
  const resolved = await resolveResource(kind, clampText(b.query, 200));
  return NextResponse.json({ resolved });
}
