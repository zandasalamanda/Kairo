import { generateJson, isObj, isClient, viaRoute } from "./provider";
import { mockSortInbox } from "./mock";
import type { SortInboxInput, SortInboxResult } from "./types";

const SYSTEM = `You are Kairo, sorting loose inbox items.
Return JSON: {"items":[{"id":string,"category":"must_do"|"high_impact"|"quick_win"|"can_wait"|"not_worth_doing","reason":string}],"reasoning":string}.
Keep every input id; categorize by urgency and impact; "reason" is a short phrase. Concise.`;

function valid(r: unknown): r is SortInboxResult {
  return isObj(r) && Array.isArray(r.items);
}

export async function sortInbox(input: SortInboxInput): Promise<SortInboxResult> {
  if (isClient()) {
    const j = await viaRoute<SortInboxResult>("/api/ai/sort-inbox", input);
    return valid(j) ? j : mockSortInbox(input);
  }
  const r = await generateJson<SortInboxResult>(SYSTEM, `Items: ${JSON.stringify(input.items)}`);
  return valid(r) ? r : mockSortInbox(input);
}
