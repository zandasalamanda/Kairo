import { generateJson, isObj, isClient, viaRouteResult, raiseIfBlocked, aiErrorText } from "./provider";
import type { AskSolaInput, AskSolaResult, SolaChange, SolaChangeKind, SolaPlanGoal } from "./types";
import type { NodeStatus } from "@/types";

// Ask Sola: a chat with agentic access to the user's plan. It reads the goals +
// node-trees (passed in) and PROPOSES structured changes; the app applies them
// only after the user approves the diff. Never mutates directly.

const SYSTEM = `You are Sola, a calm, NON-PRESCRIPTIVE planning coach inside Solaspace. You read the user's goals and step-trees and PROPOSE changes for them to accept or dismiss — you never dictate. Given the user's message and the current plan (each goal + nodes, with ids), reply in 1-3 sentences that offer a path and invite their choice (e.g. "Want me to…?"), AND propose concrete changes that fulfil the request. Prefer helping them stick to the plan they set — reschedule a missed step, offer a lighter substitute, or shrink what's stuck — over piling on new work.
Return JSON: {"reply":string,"changes":[Change]}.
A Change is one of:
- {"kind":"add","goalId","parentId","title","reason"} — add a step; parentId is a node id or null (top-level).
- {"kind":"edit","goalId","nodeId","title","reason"} — rename a step.
- {"kind":"status","goalId","nodeId","status","reason"} — status ∈ done|in_motion|blocked|not_started.
- {"kind":"deadline","goalId","date","reason"} — set the goal's target date; date is plain English ("in 6 weeks") or "no deadline".
- {"kind":"split","goalId","nodeId","into","reason"} — break a step into 2-4 sub-steps (into = titles).
Reference goals and nodes ONLY by ids present in the plan — never invent ids. Titles ≤10 words. reason ≤12 words. If nothing needs changing, return an empty changes array.`;

const KINDS: SolaChangeKind[] = ["add", "edit", "status", "deadline", "split"];
const STATUSES: NodeStatus[] = ["not_started", "in_motion", "blocked", "at_risk", "done"];

function valid(r: unknown): r is AskSolaResult {
  return isObj(r) && typeof r.reply === "string" && Array.isArray(r.changes);
}

/** Keep only changes that reference real ids and are well-formed. */
function clean(r: AskSolaResult, plan: SolaPlanGoal[]): AskSolaResult {
  const goalNodes = new Map(plan.map((g) => [g.id, new Set(g.nodes.map((n) => n.id))]));
  const changes: SolaChange[] = [];
  for (const c of r.changes) {
    if (!isObj(c) || !KINDS.includes(c.kind as SolaChangeKind)) continue;
    const goalId = String(c.goalId ?? "");
    const nodes = goalNodes.get(goalId);
    if (!nodes) continue;
    const kind = c.kind as SolaChangeKind;
    const reason = typeof c.reason === "string" ? c.reason.trim().slice(0, 90) : "";
    if (kind === "add") {
      const title = String(c.title ?? "").trim().slice(0, 90);
      const parentId = c.parentId == null ? null : nodes.has(String(c.parentId)) ? String(c.parentId) : null;
      if (title) changes.push({ kind, goalId, parentId, title, reason });
    } else if (kind === "deadline") {
      const date = String(c.date ?? "").trim().slice(0, 40);
      if (date) changes.push({ kind, goalId, date, reason });
    } else {
      const nodeId = String(c.nodeId ?? "");
      if (!nodes.has(nodeId)) continue;
      if (kind === "edit") {
        const title = String(c.title ?? "").trim().slice(0, 90);
        if (title) changes.push({ kind, goalId, nodeId, title, reason });
      } else if (kind === "status") {
        const status = c.status as NodeStatus;
        if (STATUSES.includes(status)) changes.push({ kind, goalId, nodeId, status, reason });
      } else if (kind === "split") {
        const into = Array.isArray(c.into) ? c.into.map((s) => String(s).trim().slice(0, 90)).filter(Boolean).slice(0, 4) : [];
        if (into.length) changes.push({ kind, goalId, nodeId, into, reason });
      }
    }
  }
  return { reply: r.reply.trim().slice(0, 600), changes: changes.slice(0, 20) };
}

function buildUser(input: AskSolaInput): string {
  const plan = input.plan
    .map((g) => {
      const nodes = g.nodes.map((n) => `  - [${n.id}] (${n.status}) ${n.title}${n.parentId ? ` <under ${n.parentId}>` : ""}`).join("\n");
      return `GOAL [${g.id}] "${g.title}"${g.targetDate ? ` (due ${g.targetDate})` : ""}\n${nodes}`;
    })
    .join("\n\n");
  return `Plan:\n${plan || "(no goals yet)"}\n\nUser: ${input.message}`;
}

const FALLBACK: AskSolaResult = { reply: "Sola couldn't read your plan just now — try again in a moment.", changes: [] };

export async function askSola(input: AskSolaInput): Promise<AskSolaResult> {
  if (isClient()) {
    const res = await viaRouteResult<AskSolaResult>("/api/ai/ask-sola", input);
    raiseIfBlocked(res); // 401/402/429 → AiError, so the caller can show an upgrade prompt
    return valid(res.data) ? clean(res.data, input.plan) : { reply: aiErrorText(res), changes: [] };
  }
  const r = await generateJson<AskSolaResult>(SYSTEM, buildUser(input));
  return valid(r) ? clean(r, input.plan) : FALLBACK;
}
