import type { FocusStats } from "@/types";

export interface FocusSessionRow {
  goal_id: string | null;
  minutes: number;
  created_at: string;
}

/** UTC day key (YYYY-MM-DD) for grouping sessions into a streak. */
function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY = 86_400_000;

/**
 * Pure rollup of focus sessions into momentum stats. `nowMs` is injected so the
 * streak (which walks back day-by-day from "today") is deterministic to test.
 *
 * Streak rule: count consecutive active days ending today; if today has no
 * session yet, start from yesterday so a live streak isn't zeroed before midnight.
 */
export function computeFocusStats(rows: FocusSessionRow[], nowMs: number): FocusStats {
  const empty: FocusStats = { streakDays: 0, weekSessions: 0, weekMinutes: 0, totalSessions: 0, totalMinutes: 0, perGoal: [] };
  if (rows.length === 0) return empty;

  const weekAgo = nowMs - 7 * DAY;
  const activeDays = new Set<string>();
  const perGoal = new Map<string, { minutes: number; sessions: number }>();
  let weekSessions = 0, weekMinutes = 0, totalMinutes = 0;

  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    const mins = Number(r.minutes) || 0;
    totalMinutes += mins;
    activeDays.add(dayKey(t));
    if (t >= weekAgo) { weekSessions++; weekMinutes += mins; }
    if (r.goal_id) {
      const g = perGoal.get(r.goal_id) ?? { minutes: 0, sessions: 0 };
      g.minutes += mins; g.sessions += 1;
      perGoal.set(r.goal_id, g);
    }
  }

  let cursor = nowMs;
  if (!activeDays.has(dayKey(cursor))) cursor -= DAY; // grace: today not done yet
  let streakDays = 0;
  while (activeDays.has(dayKey(cursor))) { streakDays++; cursor -= DAY; }

  return {
    streakDays,
    weekSessions,
    weekMinutes,
    totalSessions: rows.length,
    totalMinutes,
    perGoal: [...perGoal.entries()]
      .map(([goalId, v]) => ({ goalId, ...v }))
      .sort((a, b) => b.minutes - a.minutes),
  };
}
