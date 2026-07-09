import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { clerkPublic } from "@/lib/config";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { SettingsForm } from "@/components/kairo/SettingsForm";
import { NotificationSettings } from "@/components/kairo/NotificationSettings";

export const metadata: Metadata = { title: "Settings · Solaspace" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  const profile = clerkPublic ? await getProfile() : null;
  return (
    <PageContainer user={user}>
      <PageHeader eyebrow="You & Solaspace" title="Settings" description="Tune how Solaspace plans and speaks." />
      <div className="space-y-5">
        <SettingsForm user={user} />
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
      </div>
    </PageContainer>
  );
}
