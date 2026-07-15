// Single source of truth for how plans + pricing are *displayed*. The authoritative
// numbers live in lib/config.ts (pricing / planLimits); this module only shapes the
// copy so the landing, billing, and the in-app upgrade modal never drift apart.

import { pricing, planLimits } from "@/lib/config";

export const PLAN_FREE_FEATURES = [
  "Up to 2 active goals",
  "AI goal maps & a daily focus plan",
  "Hand-picked videos and guides for each step",
  "Progress tracked automatically",
  "Weekly progress review",
];

export const PLAN_PRO_FEATURES = [
  "Unlimited goals",
  "Ask Sola for coaching on any step",
  "Deep research with cited sources",
  "Reminders & a weekly digest",
  "Accountability: share your progress",
  "Priority AI + much higher limits",
];

// Loss-framed, calm — for the moment-of-intent upgrade modal. Reframes Pro as
// keeping the momentum you've already built, never fear or urgency.
export const PRO_UPGRADE_LINES = [
  "Keep every goal you start",
  "Never lose momentum on a step",
  "Your map, backed by research + reminders",
  "Keep your weekly progress record",
];

const round2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

// One place that decides how the price reads. Anchoring is honest: the yearly plan
// is shown against the real monthly price, plus a concrete per-day figure — no
// invented "value" decoy.
export const priceDisplay = {
  monthly: pricing.monthly.amount, // 12
  yearly: pricing.yearly.amount, // 96
  /** Effective per-month cost when billed yearly, whole-dollar for the headline. */
  yearlyPerMonth: Math.round(pricing.yearly.amount / 12), // 8
  /** How much cheaper yearly is than 12x monthly, as a whole percent. */
  savingsPct: Math.round((1 - pricing.yearly.amount / (pricing.monthly.amount * 12)) * 100), // 33
  /** Concrete "cents a day" anchor from the yearly price. */
  perDay: `$${round2(pricing.yearly.amount / 365)}`, // $0.26
} as const;

/** Shared, loss-framed copy for hitting the free goal cap (map modal + server mirror). */
export function upgradeReasonForGoalCap(cap: number = planLimits.free.activeGoals): string {
  return `You've mapped ${cap} goals — keep every goal you start moving. Pro removes the limit so nothing you've built has to wait.`;
}
