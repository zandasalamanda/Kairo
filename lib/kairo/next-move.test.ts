import { describe, it, expect } from "vitest";
import { computeNextMove } from "./next-move";
import type { GoalWithNodes, GoalNode } from "@/types";

const nd = (over: Partial<GoalNode>): GoalNode => ({
  id: "n", goalId: "g", parentId: null, title: "t", description: "", status: "not_started",
  progress: 0, priority: 3, estimatedMinutes: 30, dueDate: null, positionX: null, positionY: null,
  aiReason: null, createdAt: "", updatedAt: "", ...over,
});

const gl = (over: Partial<GoalWithNodes>): GoalWithNodes => ({
  id: "g", userId: "u", title: "Goal", description: "", status: "active", progress: 0,
  targetDate: null, createdAt: "", updatedAt: "", archivedAt: null, nodes: [], ...over,
});

describe("computeNextMove", () => {
  it("prefers at-risk over in-motion over not-started", () => {
    const g = gl({ nodes: [nd({ status: "not_started", title: "NS" }), nd({ status: "in_motion", title: "IM" }), nd({ status: "at_risk", title: "AR" })] });
    expect(computeNextMove([g])?.title).toBe("AR");
  });

  it("breaks ties by priority (lower first)", () => {
    const g = gl({ nodes: [nd({ status: "in_motion", title: "P3", priority: 3 }), nd({ status: "in_motion", title: "P1", priority: 1 })] });
    expect(computeNextMove([g])?.title).toBe("P1");
  });

  it("ignores done/blocked nodes and non-active goals", () => {
    const active = gl({ id: "a", title: "Active", nodes: [nd({ status: "done", title: "Done" }), nd({ status: "blocked", title: "Blocked" }), nd({ status: "not_started", title: "Go" })] });
    const paused = gl({ id: "p", status: "paused", nodes: [nd({ status: "in_motion", title: "Nope" })] });
    const move = computeNextMove([paused, active]);
    expect(move?.title).toBe("Go");
    expect(move?.goalId).toBe("a");
  });

  it("returns null when nothing is actionable", () => {
    const g = gl({ nodes: [nd({ status: "done" }), nd({ status: "blocked" })] });
    expect(computeNextMove([g])).toBeNull();
    expect(computeNextMove([])).toBeNull();
  });
});
