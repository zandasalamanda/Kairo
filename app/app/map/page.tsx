import type { Metadata } from "next";
import { getGoals, getPlan, isRemote } from "@/lib/data";
import { MapView } from "@/components/kairo/MapView";

export const metadata: Metadata = { title: "Map · Solaspace" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ goal?: string }> }) {
  const [goals, { goal }, plan] = await Promise.all([getGoals(), searchParams, getPlan()]);
  return (
    <div data-theme="dark" className="cockpit fixed inset-0 top-0 md:left-[248px]">
      <MapView goals={goals} initialGoalId={goal} remote={isRemote} isPro={plan === "pro"} />
    </div>
  );
}
