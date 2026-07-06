import type { Metadata } from "next";
import { getInbox } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { InboxBoard } from "@/components/kairo/InboxBoard";

export const metadata: Metadata = { title: "Inbox · Kairo" };

export default async function InboxPage() {
  const [items, user] = await Promise.all([getInbox(), getSessionUser()]);
  return (
    <PageContainer user={user}>
      <PageHeader eyebrow="Mental clutter → order" title="Inbox" description="Drop every loose thought. Kairo sorts it by what's urgent and what matters." />
      <InboxBoard initialItems={items} />
    </PageContainer>
  );
}
