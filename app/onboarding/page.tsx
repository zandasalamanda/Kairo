import type { Metadata } from "next";
import { OrbBackground } from "@/components/kairo/OrbBackground";
import { OnboardingFlow } from "@/components/kairo/OnboardingFlow";
import { isRemote } from "@/lib/data";

export const metadata: Metadata = { title: "Create your first goal · Solaspace" };

export default function OnboardingPage() {
  return (
    <div className="relative">
      <OrbBackground />
      <OnboardingFlow remote={isRemote} />
    </div>
  );
}
