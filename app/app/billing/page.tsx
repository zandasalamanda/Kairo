import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { pricing } from "@/lib/config";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { BillingPlans } from "@/components/kairo/BillingPlans";

export const metadata: Metadata = { title: "Upgrade · Solaspace" };

export default async function BillingPage() {
  const user = await getSessionUser();
  return (
    <PageContainer user={user}>
      <PageHeader eyebrow="Plans" title="Move faster with Pro" description="Solaspace stays calm and useful on Free. Pro unlocks unlimited goals and deeper AI planning." />
      <BillingPlans plan={user.plan} monthly={pricing.monthly.amount} yearly={pricing.yearly.amount} />
    </PageContainer>
  );
}
