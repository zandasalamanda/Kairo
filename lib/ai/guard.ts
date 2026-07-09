import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { features } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type Plan = "free" | "pro";

// Weighted AI budgets. `burst` = calls/min (anti-abuse); `day`/`month` = weighted
// "credits" (an expensive call spends more — see the `weight` on each route).
const LIMITS: Record<Plan, { burst: number; day: number; month: number }> = {
  free: { burst: 20, day: 15, month: 180 },
  pro: { burst: 40, day: 250, month: 4000 },
};

const DAY = 86_400;
const MONTH = 2_592_000;

async function planFor(userId: string, supabase: SupabaseClient): Promise<Plan> {
  if (process.env.FORCE_PLAN === "pro" && process.env.NODE_ENV !== "production") return "pro"; // non-prod only: test Pro without Stripe
  try {
    const { data } = await supabase.rpc("plan_for", { p_sub: userId });
    return data === "pro" ? "pro" : "free";
  } catch (e) {
    console.error("[guardAi] plan_for failed:", e instanceof Error ? e.message : e);
    return "free";
  }
}

async function rlHit(supabase: SupabaseClient, key: string, limit: number, windowSec: number, cost: number): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("rate_limit_hit_cost", { p_key: key, p_limit: limit, p_window_seconds: windowSec, p_cost: cost });
    return data !== false;
  } catch (e) {
    // Fail CLOSED: if we can't verify the budget, deny rather than risk unlimited spend.
    console.error("[guardAi] rate_limit_hit_cost failed (denying to protect budget):", e instanceof Error ? e.message : e);
    return false;
  }
}

export interface GuardOptions {
  /** credits this call spends (default 1); heavier calls cost more */
  weight?: number;
  /** if true, only Pro users may call this route */
  pro?: boolean;
}

/**
 * Gate an AI route: require a signed-in user, enforce a plan-aware weighted budget
 * (burst + daily + monthly credits), and optionally require Pro. Returns a response
 * to short-circuit (401 / 402 / 429), or null to proceed.
 */
export async function guardAi(opts: GuardOptions = {}): Promise<NextResponse | null> {
  if (!features.clerk) return null;
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to use Solaspace." }, { status: 401 });

  // The limiter runs with the SERVICE-ROLE client so clients can't reach the
  // counter RPCs directly (they're revoked from anon/authenticated).
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    // Unavailable while Supabase is configured = misconfig; fail closed to
    // protect the AI budget rather than allow unlimited calls.
    if (features.supabase) {
      console.error("[guardAi] service-role client unavailable — denying to protect the AI budget");
      return NextResponse.json({ error: "AI is temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    return null; // demo mode (no DB) — nothing to meter
  }

  const weight = Math.max(1, Math.round(opts.weight ?? 1));
  const plan = await planFor(userId, supabase);

  if (opts.pro && plan !== "pro") {
    return NextResponse.json({ error: "That's a Pro feature.", upgrade: true }, { status: 402 });
  }

  const L = LIMITS[plan];
  const [burst, day, month] = await Promise.all([
    rlHit(supabase, `ai:m:${userId}`, L.burst, 60, 1),
    rlHit(supabase, `ai:cd:${userId}`, L.day, DAY, weight),
    rlHit(supabase, `ai:cmo:${userId}`, L.month, MONTH, weight),
  ]);

  if (!burst) return NextResponse.json({ error: "You're going a bit fast — give it a moment." }, { status: 429 });
  if (!day || !month) {
    return NextResponse.json(
      {
        error: plan === "pro" ? "You've reached today's AI limit — it resets tomorrow." : "You've used today's free AI. Upgrade to Pro for much more.",
        upgrade: plan !== "pro",
      },
      { status: 429 }
    );
  }
  return null;
}

/** Coerce to a string and cap its length (keeps unbounded prompts out of the model). */
export function clampText(v: unknown, max = 2000): string {
  return String(v ?? "").slice(0, max);
}
