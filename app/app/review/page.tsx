import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { getGoals, getTodayPlan } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { generateReview } from "@/lib/ai/generate-review";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { ReviewPanel } from "@/components/kairo/ReviewPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Review · Aether" };

export default async function ReviewPage() {
  const [goals, plan, user] = await Promise.all([getGoals(), getTodayPlan(), getSessionUser()]);
  const review = goals.length > 0 ? await generateReview({ goals, recentPlan: plan }) : null;
  return (
    <PageContainer user={user}>
      <PageHeader eyebrow="What changed" title="Where things stand" description="Aether keeps your plan honest — what moved and what's slipping. Your next move is always in the dock." />
      {goals.length === 0 ? (
        <EmptyState
          icon={<Compass size={22} />}
          title="Nothing to review yet"
          description="Map your first goal and Aether will track what's moving and what's slipping."
          action={
            <Link href="/app/map">
              <Button variant="primary" size="lg">Create a goal</Button>
            </Link>
          }
        />
      ) : (
        review && <ReviewPanel review={review} />
      )}
    </PageContainer>
  );
}
