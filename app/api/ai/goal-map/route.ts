import { NextResponse } from "next/server";
import { generateGoalMap } from "@/lib/ai/generate-goal-map";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { prompt?: unknown };
  const result = await generateGoalMap({ prompt: String(body.prompt ?? "") });
  return NextResponse.json(result);
}
