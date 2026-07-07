import { NextResponse } from "next/server";
import { unblock } from "@/lib/ai/work-session";
import { guardAi, clampText } from "@/lib/ai/guard";

export async function POST(req: Request) {
  const denied = await guardAi();
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await unblock({
    goalTitle: clampText(b.goalTitle, 300),
    nodeTitle: clampText(b.nodeTitle, 300),
    context: clampText(b.context, 600),
  });
  return NextResponse.json(result);
}
