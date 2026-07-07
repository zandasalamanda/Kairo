import { describe, it, expect } from "vitest";
import { computeFocusStats, type FocusSessionRow } from "./focus-stats";

// Fixed "now": 2026-07-07T12:00:00Z (a Tuesday, noon UTC).
const NOW = Date.parse("2026-07-07T12:00:00Z");
const DAY = 86_400_000;
const at = (msAgoDays: number, minutes: number, goal_id: string | null = "g1"): FocusSessionRow => ({
  goal_id,
  minutes,
  created_at: new Date(NOW - msAgoDays * DAY).toISOString(),
});

describe("computeFocusStats", () => {
  it("returns all zeros for no sessions", () => {
    const s = computeFocusStats([], NOW);
    expect(s).toEqual({ streakDays: 0, weekSessions: 0, weekMinutes: 0, totalSessions: 0, totalMinutes: 0, perGoal: [] });
  });

  it("counts a streak of consecutive days including today", () => {
    const s = computeFocusStats([at(0, 25), at(1, 25), at(2, 25)], NOW);
    expect(s.streakDays).toBe(3);
  });

  it("keeps yesterday's streak alive when today has no session yet (grace day)", () => {
    const s = computeFocusStats([at(1, 25), at(2, 25)], NOW);
    expect(s.streakDays).toBe(2);
  });

  it("breaks the streak on a gap", () => {
    // today + yesterday, then a gap at day 2, then day 3.
    const s = computeFocusStats([at(0, 25), at(1, 25), at(3, 25)], NOW);
    expect(s.streakDays).toBe(2);
  });

  it("is zero when the most recent session is 2+ days old", () => {
    const s = computeFocusStats([at(2, 25), at(3, 25)], NOW);
    expect(s.streakDays).toBe(0);
  });

  it("sums week vs all-time and rolls up per goal, most-focused first", () => {
    const s = computeFocusStats(
      [at(0, 30, "g1"), at(1, 20, "g1"), at(3, 15, "g2"), at(10, 100, "g1")],
      NOW
    );
    expect(s.totalSessions).toBe(4);
    expect(s.totalMinutes).toBe(165);
    // last 7 days excludes the 10-day-old 100-min session.
    expect(s.weekSessions).toBe(3);
    expect(s.weekMinutes).toBe(65);
    expect(s.perGoal).toEqual([
      { goalId: "g1", minutes: 150, sessions: 3 },
      { goalId: "g2", minutes: 15, sessions: 1 },
    ]);
  });

  it("ignores null goal_id in the per-goal rollup but still counts totals", () => {
    const s = computeFocusStats([at(0, 25, null), at(0, 10, "g1")], NOW);
    expect(s.totalMinutes).toBe(35);
    expect(s.perGoal).toEqual([{ goalId: "g1", minutes: 10, sessions: 1 }]);
  });
});
