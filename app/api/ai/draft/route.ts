import { NextResponse } from "next/server";
import { draftForStep } from "@/lib/ai/draft";
import { guardAi, clampText } from "@/lib/ai/guard";

export async function POST(req: Request) {
  const denied = await guardAi();
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await draftForStep({
    goalTitle: clampText(b.goalTitle, 300),
    nodeTitle: clampText(b.nodeTitle, 300),
    nodeDescription: clampText(b.nodeDescription, 600),
    context: clampText(b.context, 600),
    instruction: clampText(b.instruction, 300),
  });
  return NextResponse.json(result);
}
