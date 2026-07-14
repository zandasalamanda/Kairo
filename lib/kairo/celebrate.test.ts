import { describe, it, expect } from "vitest";
import { pickCelebration, pickGoalCelebration, hashId, DONE_LINES } from "./celebrate";

describe("pickCelebration", () => {
  it("is deterministic for the same node id", () => {
    expect(pickCelebration("node-abc")).toEqual(pickCelebration("node-abc"));
  });

  it("picks a real line from the library", () => {
    const c = pickCelebration("some-node");
    expect(DONE_LINES.some((l) => l.title === c.title)).toBe(true);
    expect(c.proof).toBe(false);
  });

  it("swaps the sub-copy when proof is attached and flags it", () => {
    const plain = pickCelebration("n1", null);
    const metric = pickCelebration("n1", "metric");
    expect(metric.title).toBe(plain.title); // title is stable per id
    expect(metric.sub).not.toBe(plain.sub);
    expect(metric.proof).toBe(true);
  });
});

describe("pickGoalCelebration", () => {
  it("is deterministic per goal id", () => {
    expect(pickGoalCelebration("g1")).toEqual(pickGoalCelebration("g1"));
  });
});

describe("hashId", () => {
  it("is stable and non-negative", () => {
    expect(hashId("x")).toBe(hashId("x"));
    expect(hashId("anything")).toBeGreaterThanOrEqual(0);
  });
});
