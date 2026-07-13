import { getSessionUser } from "@/lib/auth";
import { getGoals, isRemote } from "@/lib/data";
import { getAiUsage } from "@/lib/ai/usage";
import { computeNextMove } from "@/lib/kairo/next-move";
import { KairoShell } from "@/components/layout/KairoShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, goals] = await Promise.all([getSessionUser(), getGoals()]);
  // No goals? The galaxy map (home) is the first-run experience — it invites
  // you to create your first goal right there, so no forced onboarding detour.
  const nextMove = computeNextMove(goals);
  // A visible AI-usage indicator in the shell (research: show it before the wall).
  const usage = isRemote ? await getAiUsage(user.id, user.plan) : null;
  return (
    <KairoShell user={user} nextMove={nextMove} usage={usage ? { dayUsed: usage.dayUsed, dayLimit: usage.dayLimit } : null}>
      {children}
    </KairoShell>
  );
}
