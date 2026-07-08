import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedGoal } from "@/lib/data/shared";
import { SharedGoalView } from "@/components/kairo/SharedGoalView";

type Params = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const shared = await getSharedGoal(token);
  if (!shared) return { title: "Shared plan · Solaspace" };
  return {
    title: `${shared.goal.title} · Solaspace`,
    description: shared.goal.description || `A goal plan mapped with Solaspace.`,
    robots: { index: false },
  };
}

export default async function SharedGoalPage({ params }: Params) {
  const { token } = await params;
  const shared = await getSharedGoal(token);
  if (!shared) notFound();
  return <SharedGoalView shared={shared} />;
}
