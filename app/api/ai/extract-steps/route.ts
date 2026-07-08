import { NextResponse } from "next/server";
import { extractSteps } from "@/lib/ai/extract-steps";
import { guardAi, clampText } from "@/lib/ai/guard";

export async function POST(req: Request) {
  const denied = await guardAi({ weight: 2 });
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await extractSteps({
    goalTitle: clampText(b.goalTitle, 300),
    notes: clampText(b.notes, 4000),
  });
  return NextResponse.json(result);
}
