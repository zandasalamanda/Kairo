import { NextResponse } from "next/server";
import { planSession } from "@/lib/ai/work-session";
import { guardAi, clampText } from "@/lib/ai/guard";

export async function POST(req: Request) {
  const denied = await guardAi();
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const minutes = Math.min(180, Math.max(5, Math.round(Number(b.minutes) || 25)));
  const result = await planSession({
    goalTitle: clampText(b.goalTitle, 300),
    nodeTitle: clampText(b.nodeTitle, 300),
    nodeDescription: clampText(b.nodeDescription, 600),
    minutes,
    context: clampText(b.context, 600),
  });
  return NextResponse.json(result);
}
