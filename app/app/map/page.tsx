import type { Metadata } from "next";
import { getGoals } from "@/lib/data";
import { LiveMap } from "@/components/kairo/LiveMap";

export const metadata: Metadata = { title: "Map · Kairo" };

export default async function MapPage() {
  const goals = await getGoals();
  return (
    <div className="fixed inset-0 top-0 md:left-[248px]">
      <LiveMap goals={goals} />
    </div>
  );
}
