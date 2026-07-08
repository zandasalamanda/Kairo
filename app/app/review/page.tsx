import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { getGoals, getFocusStats, getReviewInsights } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { ReviewMirror } from "@/components/kairo/ReviewMirror";
import { MomentumStrip } from "@/components/kairo/MomentumStrip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Review · Solaspace" };

export default async function ReviewPage() {
  const [goals, user, focus, insights] = await Promise.all([getGoals(), getSessionUser(), getFocusStats(), getReviewInsights()]);
  return (
    <PageContainer user={user}>
      <PageHeader eyebrow="The honest mirror" title="Will you make it?" description="What the map can't show you — your pace to each deadline, what's stalled, and what you've stopped touching." />
      {goals.length === 0 || !insights ? (
        <EmptyState
          icon={<Compass size={22} />}
          title="Nothing to review yet"
          description="Map a goal with a deadline and Solaspace will tell you whether you're on pace to hit it."
          action={
            <Link href="/app/map">
              <Button variant="primary" size="lg">Create a goal</Button>
            </Link>
          }
        />
      ) : (
        <div className="max-w-xl space-y-10">
          <ReviewMirror insights={insights} goals={goals} />
          <MomentumStrip stats={focus} goals={goals} />
        </div>
      )}
    </PageContainer>
  );
}
