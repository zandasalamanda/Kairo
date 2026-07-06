import { redirect } from "next/navigation";
import type { Plan } from "@/types";
import { buildSeed } from "@/lib/mock/seed";
import { features } from "@/lib/config";
import { ensureProfile } from "@/lib/data/profile";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  initials: string;
}

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

/**
 * The current user. Uses Clerk when configured (redirecting anonymous visitors
 * to sign-in); otherwise returns the seeded demo user so the app is explorable.
 */
export async function getSessionUser(): Promise<SessionUser> {
  if (features.clerk) {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");
    const u = await currentUser();
    const name = u?.fullName || u?.firstName || u?.username || "You";
    // Provision the Supabase profile on first sign-in and read the real plan.
    const profile = features.supabase ? await ensureProfile() : null;
    return {
      id: userId,
      name,
      email: u?.primaryEmailAddress?.emailAddress ?? "",
      plan: profile?.plan ?? "free",
      initials: initialsOf(name),
    };
  }

  const p = buildSeed().profile;
  return { id: p.id, name: p.displayName, email: p.email, plan: p.plan, initials: initialsOf(p.displayName) };
}
