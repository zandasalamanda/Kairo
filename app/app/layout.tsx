import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getGoals, isRemote } from "@/lib/data";
import { computeNextMove } from "@/lib/kairo/next-move";
import { KairoShell } from "@/components/layout/KairoShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, goals] = await Promise.all([getSessionUser(), getGoals()]);
  // A signed-in user with no goals yet hasn't mapped their first one — send
  // them through onboarding (demo mode always has seeded goals, so it stays put).
  if (isRemote && goals.length === 0) redirect("/onboarding");
  const nextMove = computeNextMove(goals);
  return (
    <KairoShell user={user} nextMove={nextMove}>
      {children}
    </KairoShell>
  );
}
