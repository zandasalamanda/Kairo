import "server-only";
import { NextResponse } from "next/server";
import { features } from "@/lib/config";

/**
 * Gate an AI route: when Clerk is configured (production), require a signed-in
 * user so the model can't be driven by anonymous traffic. In demo mode (no
 * Clerk) it stays open — but with no key there, every call falls back to the
 * deterministic mock, so nothing paid is reachable.
 * Returns a 401 response to short-circuit, or null to proceed.
 */
export async function requireUser(): Promise<NextResponse | null> {
  if (!features.clerk) return null;
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to use Aether." }, { status: 401 });
  return null;
}

/** Coerce to a string and cap its length (keeps unbounded prompts out of the model). */
export function clampText(v: unknown, max = 2000): string {
  return String(v ?? "").slice(0, max);
}
