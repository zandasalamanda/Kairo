import { NextResponse } from "next/server";
import { buildDailyPlan } from "@/lib/ai/build-daily-plan";
import type { DailyPlanInput } from "@/lib/ai/types";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<DailyPlanInput>;
  const result = await buildDailyPlan({
    availableMinutes: Number(body.availableMinutes) || 60,
    energy: body.energy ?? "normal",
    context: String(body.context ?? ""),
    goals: Array.isArray(body.goals) ? body.goals : [],
  });
  return NextResponse.json(result);
}
