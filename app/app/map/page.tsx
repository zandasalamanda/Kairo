import type { Metadata } from "next";
import { getGoals, isRemote } from "@/lib/data";
import { LiveMap } from "@/components/kairo/LiveMap";

export const metadata: Metadata = { title: "Map · Aether" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ goal?: string }> }) {
  const [goals, { goal }] = await Promise.all([getGoals(), searchParams]);
  return (
    <div className="fixed inset-0 top-0 md:left-[248px]">
      <LiveMap goals={goals} initialGoalId={goal} remote={isRemote} />
    </div>
  );
}
