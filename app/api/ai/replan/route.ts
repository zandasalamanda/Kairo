import { NextResponse } from "next/server";
import { replanGoal } from "@/lib/ai/replan";
import { guardAi, clampText } from "@/lib/ai/guard";
import { isObj } from "@/lib/ai/provider";
import type { NodeStatus } from "@/types";

export async function POST(req: Request) {
  const denied = await guardAi({ weight: 2 });
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nodes = Array.isArray(b.nodes)
    ? b.nodes.slice(0, 40).map((n) => ({
        title: clampText(isObj(n) ? n.title : "", 160),
        status: (isObj(n) ? String(n.status) : "not_started") as NodeStatus,
      })).filter((n) => n.title)
    : [];
  const result = await replanGoal({
    goalTitle: clampText(b.goalTitle, 300),
    nodes,
    context: clampText(b.context, 600),
  });
  return NextResponse.json(result);
}
