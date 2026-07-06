import type { Metadata } from "next";
import { getGoals } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { TodayBuilder } from "@/components/kairo/TodayBuilder";

export const metadata: Metadata = { title: "Today · Kairo" };

export default async function TodayPage() {
  const [goals, user] = await Promise.all([getGoals(), getSessionUser()]);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <PageContainer user={user}>
      <PageHeader eyebrow={today} title="Today" description="How much time and energy do you have? Kairo builds the plan that fits." />
      <TodayBuilder goals={goals} />
    </PageContainer>
  );
}
