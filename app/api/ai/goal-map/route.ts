import { NextResponse } from "next/server";
import { generateGoalMap } from "@/lib/ai/generate-goal-map";
import { guardAi, clampText } from "@/lib/ai/guard";

export async function POST(req: Request) {
  const denied = await guardAi({ weight: 3 });
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { prompt?: unknown };
  const result = await generateGoalMap({ prompt: clampText(body.prompt) });
  return NextResponse.json(result);
}
