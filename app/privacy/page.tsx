import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/kairo/LegalPage";

export const metadata: Metadata = { title: "Privacy · Solaspace" };

const CONTACT = "zander.leon@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <p>
        Solaspace helps you turn goals into a plan. This policy explains what we collect, how we use it, and the
        choices you have. We keep it short because we keep the data small.
      </p>

      <LegalSection heading="What we collect">
        <ul className="ml-5 list-disc space-y-1.5">
          <li><span className="text-ink">Account details</span> — your name and email address, handled by our authentication provider, Clerk.</li>
          <li><span className="text-ink">Your content</span> — the goals, steps, deadlines, and inbox notes you create in the app.</li>
          <li><span className="text-ink">Basic technical data</span> — standard server logs needed to run and secure the service.</li>
        </ul>
        <p>We do not collect payment card details directly; if you subscribe, payments are handled by Stripe.</p>
      </LegalSection>

      <LegalSection heading="How your goals are processed by AI">
        <p>
          When you ask Solaspace to map a goal or break down a step, the text you enter is sent to Google&rsquo;s Gemini
          API to generate your plan. Only what&rsquo;s needed for that request is sent. We do not sell your data or use
          it to build advertising profiles.
        </p>
      </LegalSection>

      <LegalSection heading="Where your data is stored">
        <p>
          Your account content is stored in a Supabase (PostgreSQL) database and isolated so that only your account
          can read it. Authentication is managed by Clerk. These providers process data on our behalf.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>We use only essential cookies required to keep you signed in. We don&rsquo;t use advertising or tracking cookies.</p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can view and edit your content in the app at any time. You can permanently delete your account and all
          associated data from <span className="text-ink">Settings → Delete my account and data</span>. Deletion removes
          your goals, steps, notes, and account record. You may also email us to request access or deletion.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about your privacy? Email <a href={`mailto:${CONTACT}`} className="text-accent underline underline-offset-2">{CONTACT}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
