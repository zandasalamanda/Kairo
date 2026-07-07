import "server-only";
import { NextResponse } from "next/server";
import { features } from "@/lib/config";
import { getSupabaseServer } from "@/lib/supabase/server";

// Per-user AI limits: a burst window + a daily cap. Generous for a real person,
// tight enough to stop a script draining the shared model key.
const PER_MINUTE = { limit: 20, window: 60 };
const PER_DAY = { limit: 200, window: 86_400 };

async function overLimit(userId: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  if (!supabase) return false; // no DB configured — auth still gates the route
  try {
    const [min, day] = await Promise.all([
      supabase.rpc("rate_limit_hit", { p_key: `ai:m:${userId}`, p_limit: PER_MINUTE.limit, p_window_seconds: PER_MINUTE.window }),
      supabase.rpc("rate_limit_hit", { p_key: `ai:d:${userId}`, p_limit: PER_DAY.limit, p_window_seconds: PER_DAY.window }),
    ]);
    // rate_limit_hit returns true while under the limit. Fail open on any error.
    return min.data === false || day.data === false;
  } catch {
    return false;
  }
}

/**
 * Gate an AI route: when Clerk is configured (production), require a signed-in
 * user and enforce a per-user rate limit. In demo mode (no Clerk) it stays open,
 * but with no key there every call falls back to the deterministic mock.
 * Returns a response to short-circuit (401 / 429), or null to proceed.
 */
export async function guardAi(): Promise<NextResponse | null> {
  if (!features.clerk) return null;
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to use Aether." }, { status: 401 });
  if (await overLimit(userId)) {
    return NextResponse.json({ error: "You're going a bit fast — give it a moment." }, { status: 429 });
  }
  return null;
}

/** Coerce to a string and cap its length (keeps unbounded prompts out of the model). */
export function clampText(v: unknown, max = 2000): string {
  return String(v ?? "").slice(0, max);
}
