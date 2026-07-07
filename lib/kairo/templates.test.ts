import { describe, it, expect } from "vitest";
import { TEMPLATES, templateToMap, type GoalTemplate } from "./templates";

const NOW = Date.parse("2026-07-07T00:00:00Z");

const sample: GoalTemplate = {
  id: "t", title: "Test", blurb: "b", category: "C", icon: "target", targetWeeks: 2,
  milestones: [
    { title: "M0", subs: [{ title: "M0-sub" }] },
    { title: "M1" },
  ],
};

describe("templateToMap", () => {
  it("chains milestones and nests sub-steps by index", () => {
    const map = templateToMap(sample, NOW);
    // Order: M0, M0-sub, M1
    expect(map.nodes.map((n) => n.title)).toEqual(["M0", "M0-sub", "M1"]);
    expect(map.nodes[0].parentIndex).toBeNull();          // first milestone = root
    expect(map.nodes[1].parentIndex).toBe(0);             // sub hangs off M0
    expect(map.nodes[2].parentIndex).toBe(0);             // M1 chains off M0 (time = depth)
  });

  it("computes the target date from targetWeeks", () => {
    const map = templateToMap(sample, NOW);
    expect(map.suggestedTargetDate).toBe("2026-07-21"); // +14 days
  });

  it("every parentIndex references an earlier node (valid tree)", () => {
    for (const t of TEMPLATES) {
      const map = templateToMap(t, NOW);
      map.nodes.forEach((n, i) => {
        if (n.parentIndex !== null) {
          expect(n.parentIndex).toBeGreaterThanOrEqual(0);
          expect(n.parentIndex).toBeLessThan(i);
        }
      });
    }
  });

  it("uses a valid-looking icon and non-empty milestones for each template", () => {
    for (const t of TEMPLATES) {
      expect(t.icon).toBeTruthy();
      expect(t.milestones.length).toBeGreaterThanOrEqual(3);
    }
  });
});
