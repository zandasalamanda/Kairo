import type { Metadata } from "next";
import { getGoals, isRemote } from "@/lib/data";
import { GalaxyMap } from "@/components/kairo/GalaxyMap";

export const metadata: Metadata = { title: "Map · Solaspace" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ goal?: string }> }) {
  const [goals, { goal }] = await Promise.all([getGoals(), searchParams]);
  return (
    <div className="fixed inset-0 top-0 md:left-[248px]">
      <GalaxyMap goals={goals} initialGoalId={goal} remote={isRemote} />
    </div>
  );
}
