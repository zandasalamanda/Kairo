import { NextResponse } from "next/server";
import { askNode } from "@/lib/ai/node-assist";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await askNode({
    goalTitle: String(b.goalTitle ?? ""),
    nodeTitle: String(b.nodeTitle ?? ""),
    question: String(b.question ?? ""),
  });
  return NextResponse.json(result);
}
