import { NextResponse } from "next/server";
import { sortInbox } from "@/lib/ai/sort-inbox";
import type { SortInboxInput } from "@/lib/ai/types";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<SortInboxInput>;
  const items = Array.isArray(body.items) ? body.items : [];
  const result = await sortInbox({ items });
  return NextResponse.json(result);
}
