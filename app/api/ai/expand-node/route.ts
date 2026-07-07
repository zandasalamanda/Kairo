import { NextResponse } from "next/server";
import { expandNode } from "@/lib/ai/node-assist";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await expandNode({
    goalTitle: String(b.goalTitle ?? ""),
    nodeTitle: String(b.nodeTitle ?? ""),
    nodeDescription: String(b.nodeDescription ?? ""),
  });
  return NextResponse.json(result);
}
