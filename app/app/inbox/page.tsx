import type { Metadata } from "next";
import { getInbox, isRemote } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/kairo/PageHeader";
import { InboxBoard } from "@/components/kairo/InboxBoard";

export const metadata: Metadata = { title: "Inbox · Solaspace" };

export default async function InboxPage() {
  const [items, user] = await Promise.all([getInbox(), getSessionUser()]);
  return (
    <PageContainer user={user}>
      <PageHeader title="Inbox" description="Capture now. Let Solaspace organize later." />
      <InboxBoard initialItems={items} remote={isRemote} />
    </PageContainer>
  );
}
