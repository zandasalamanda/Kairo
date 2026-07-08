import type { Metadata } from "next";
import { getGoals, isRemote } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { Notebook } from "@/components/kairo/Notebook";

export const metadata: Metadata = { title: "Notebook · Solaspace" };

export default async function NotebookPage({ searchParams }: { searchParams: Promise<{ goal?: string }> }) {
  const [goals, user, { goal }] = await Promise.all([getGoals(), getSessionUser(), searchParams]);
  return (
    <PageContainer user={user}>
      <PageHeader title="Notebook" description="Context and thoughts for each goal — Solaspace uses these when you ask or break down a step." />
      <Notebook goals={goals} remote={isRemote} initialGoalId={goal} />
    </PageContainer>
  );
}
