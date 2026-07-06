import { generateJson, isObj } from "./provider";
import { mockReview } from "./mock";
import type { ReviewInput, ReviewResult } from "./types";

const SYSTEM = `You are Kairo, reviewing a user's goals and recent plan.
Return JSON: {"summary":string,"changes":string[],"risks":string[],"recoverability":string,"nextBestMove":string}.
"changes" = what moved; "risks" = what's slipping; "recoverability" = one honest sentence; "nextBestMove" = the single best next action. Practical, no vague advice, no guarantees.`;

function valid(r: unknown): r is ReviewResult {
  return isObj(r) && typeof r.summary === "string" && Array.isArray(r.changes) && Array.isArray(r.risks) && typeof r.nextBestMove === "string";
}

export async function generateReview(input: ReviewInput): Promise<ReviewResult> {
  const goals = input.goals.map((g) => ({ title: g.title, status: g.status, progress: g.progress, nodes: g.nodes.map((n) => ({ title: n.title, status: n.status })) }));
  const pushed = input.recentPlan?.blocks.filter((b) => b.status === "pushed").map((b) => b.title) ?? [];
  const user = `Goals: ${JSON.stringify(goals)}\nPushed today: ${JSON.stringify(pushed)}`;
  const r = await generateJson<ReviewResult>(SYSTEM, user);
  return valid(r) ? r : mockReview(input);
}
