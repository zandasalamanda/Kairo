import { describe, it, expect } from "vitest";
import { priceDisplay, upgradeReasonForGoalCap, PLAN_FREE_FEATURES, PLAN_PRO_FEATURES, PRO_UPGRADE_LINES } from "./plans";

describe("priceDisplay", () => {
  it("derives an honest yearly-per-month, savings, and per-day anchor", () => {
    expect(priceDisplay.monthly).toBe(10);
    expect(priceDisplay.yearly).toBe(96);
    expect(priceDisplay.yearlyPerMonth).toBe(8); // 96 / 12
    expect(priceDisplay.savingsPct).toBe(20); // 1 - 96/120
    expect(priceDisplay.perDay).toBe("$0.26"); // 96 / 365
  });
});

describe("upgradeReasonForGoalCap", () => {
  it("names the cap and is loss-framed (keep, not lose)", () => {
    const r = upgradeReasonForGoalCap(2);
    expect(r).toContain("2 goals");
    expect(r.toLowerCase()).toContain("keep");
  });
});

describe("plan feature copy", () => {
  it("exposes non-empty, distinct free and pro feature lists", () => {
    expect(PLAN_FREE_FEATURES.length).toBeGreaterThan(0);
    expect(PLAN_PRO_FEATURES.length).toBeGreaterThan(0);
    expect(PRO_UPGRADE_LINES.length).toBeGreaterThan(0);
  });
});
