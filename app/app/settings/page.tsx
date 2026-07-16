import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getProfile, getPlan } from "@/lib/data";
import { getAiUsage } from "@/lib/ai/usage";
import { clerkPublic } from "@/lib/config";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { SettingsForm } from "@/components/kairo/SettingsForm";
import { ThemeToggle } from "@/components/kairo/ThemeToggle";
import { NotificationSettings } from "@/components/kairo/NotificationSettings";
import { UsageMeter } from "@/components/kairo/UsageMeter";

export const metadata: Metadata = { title: "Settings · Solaspace" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  const profile = clerkPublic ? await getProfile() : null;
  const plan = clerkPublic ? await getPlan() : "free";
  const usage = clerkPublic ? await getAiUsage(user.id, plan) : null;
  const admin = clerkPublic ? await isAdmin() : false;
  return (
    <PageContainer user={user}>
      <PageHeader eyebrow="You & Solaspace" title="Settings" description="Tune how Solaspace plans and speaks." />
      <div className="space-y-5">
        <SettingsForm user={user} />
        <ThemeToggle />
        {usage && <UsageMeter {...usage} />}
        {profile && (
          <NotificationSettings
            initial={{
              email: profile.notifyEmail ?? true,
              deadlines: profile.notifyDeadlines ?? true,
              nudges: profile.notifyNudges ?? true,
              digest: profile.notifyDigest ?? true,
            }}
          />
        )}
        {admin && (
          <Link href="/app/admin" className="block text-center font-mono text-[11px] uppercase tracking-[0.16em] text-faint transition-colors hover:text-muted">
            Admin panel &rarr;
          </Link>
        )}
      </div>
    </PageContainer>
  );
}
