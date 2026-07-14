// Shared celebration copy + feedback, so every "win" across the app (map, Today,
// focus session, whole-goal completion) reads the same warm, on-brand line without
// spending an AI token. One line is chosen deterministically per id, so a given
// step always reads the same and it never feels random or cheesy.

export type ProofKind = "link" | "note" | "metric" | null;

export const DONE_LINES: { title: string; sub: string }[] = [
  { title: "Beautiful.", sub: "A real step, done." },
  { title: "Yes, done.", sub: "You moved the map today." },
  { title: "Love to see it.", sub: "One piece closer." },
  { title: "That's the way.", sub: "The momentum's yours." },
  { title: "Nicely done.", sub: "That one counts." },
  { title: "Good work.", sub: "The path just got shorter." },
];

// The bigger moment: a whole goal finished, every step on the map done.
export const GOAL_DONE_LINES: { title: string; sub: string }[] = [
  { title: "You arrived.", sub: "Every step on this map is done." },
  { title: "That's a finish.", sub: "You saw the whole path through." },
  { title: "Goal complete.", sub: "You built this, start to end." },
];

export function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface CelebrationCopy {
  title: string;
  sub: string;
  proof: boolean;
}

/** The reward line for finishing a single step (proof-aware). */
export function pickCelebration(nodeId: string, proofKind: ProofKind = null): CelebrationCopy {
  const base = DONE_LINES[hashId(nodeId) % DONE_LINES.length];
  const sub = proofKind
    ? proofKind === "metric"
      ? "Logged. That number's yours."
      : proofKind === "link"
        ? "Saved. The proof's on your map."
        : "Saved. A note to future you."
    : base.sub;
  return { title: base.title, sub, proof: proofKind !== null };
}

/** The reward line for finishing a whole goal. */
export function pickGoalCelebration(goalId: string): { title: string; sub: string } {
  return GOAL_DONE_LINES[hashId(goalId) % GOAL_DONE_LINES.length];
}

// A tasteful haptic tap for a real win — no-op where unsupported or when the user
// prefers reduced motion. Delight, never noise.
export function fireHaptic(pattern: number | number[] = 12): void {
  if (typeof window === "undefined") return;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported — ignore */
  }
}
