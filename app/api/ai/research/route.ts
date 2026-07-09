import { NextResponse } from "next/server";
import { research } from "@/lib/ai/research";
import { guardAi, clampText } from "@/lib/ai/guard";

export async function POST(req: Request) {
  // Grounded search is the priciest call — Pro-only, higher weight.
  const denied = await guardAi({ weight: 4, pro: true });
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { goalTitle?: unknown; nodeTitle?: unknown; context?: unknown; question?: unknown };
  const result = await research({
    goalTitle: clampText(body.goalTitle, 200),
    nodeTitle: clampText(body.nodeTitle, 200),
    context: body.context ? clampText(body.context, 2000) : undefined,
    question: body.question ? clampText(body.question, 500) : undefined,
  });
  return NextResponse.json(result);
}
