import type { Metadata } from "next";
import { getGoals, isRemote } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { CockpitView } from "@/components/kairo/CockpitView";

export const metadata: Metadata = { title: "Today · Solaspace" };

export default async function TodayPage() {
  const [goals, user] = await Promise.all([getGoals(), getSessionUser()]);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <PageContainer user={user}>
      <PageHeader eyebrow={today} title="Your move" description="The next real step in each goal — pick one and run a focus session, right here." />
      <CockpitView goals={goals} remote={isRemote} />
    </PageContainer>
  );
}
