import { NextResponse } from "next/server";
import { askSola } from "@/lib/ai/ask-sola";
import { guardAi, clampText } from "@/lib/ai/guard";
import { isObj } from "@/lib/ai/provider";
import type { NodeStatus } from "@/types";

export async function POST(req: Request) {
  const denied = await guardAi({ weight: 2, pro: true });
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const message = clampText(b.message, 1000);
  const plan = Array.isArray(b.plan)
    ? b.plan.slice(0, 12).map((g) => ({
        id: clampText(isObj(g) ? g.id : "", 60),
        title: clampText(isObj(g) ? g.title : "", 200),
        targetDate: isObj(g) && g.targetDate ? clampText(g.targetDate, 40) : null,
        nodes: isObj(g) && Array.isArray(g.nodes)
          ? g.nodes.slice(0, 60).map((n) => ({
              id: clampText(isObj(n) ? n.id : "", 60),
              parentId: isObj(n) && n.parentId ? clampText(n.parentId, 60) : null,
              title: clampText(isObj(n) ? n.title : "", 200),
              status: (isObj(n) ? String(n.status) : "not_started") as NodeStatus,
            })).filter((n) => n.id && n.title)
          : [],
      })).filter((g) => g.id)
    : [];
  const result = await askSola({ message, plan });
  return NextResponse.json(result);
}
