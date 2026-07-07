import { NextResponse } from "next/server";
import { askNode } from "@/lib/ai/node-assist";
import { guardAi, clampText } from "@/lib/ai/guard";

export async function POST(req: Request) {
  const denied = await guardAi();
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await askNode({
    goalTitle: clampText(b.goalTitle, 300),
    nodeTitle: clampText(b.nodeTitle, 300),
    question: clampText(b.question, 600),
    context: clampText(b.context, 1200),
  });
  return NextResponse.json(result);
}
