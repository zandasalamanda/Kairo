import type { Metadata } from "next";
import { getGoals, getTodayPlan } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { generateReview } from "@/lib/ai/generate-review";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { ReviewPanel } from "@/components/kairo/ReviewPanel";

export const metadata: Metadata = { title: "Review · Kairo" };

export default async function ReviewPage() {
  const [goals, plan, user] = await Promise.all([getGoals(), getTodayPlan(), getSessionUser()]);
  const review = await generateReview({ goals, recentPlan: plan });
  return (
    <PageContainer user={user}>
      <PageHeader eyebrow="What changed" title="Where things stand" description="Kairo keeps your plan honest — what moved and what's slipping. Your next move is always in the dock." />
      <ReviewPanel review={review} />
    </PageContainer>
  );
}
