import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { features } from "@/lib/config";
import { AuthShell } from "@/components/kairo/AuthShell";
import { AuthCard } from "@/components/kairo/AuthCard";
import { clerkAppearance } from "@/lib/clerk/appearance";

export const metadata: Metadata = { title: "Sign in · Solaspace" };

export default function SignInPage() {
  return (
    <AuthShell>
      {features.clerk ? (
        <SignIn routing="hash" signUpUrl="/sign-up" fallbackRedirectUrl="/app/today" appearance={clerkAppearance} />
      ) : (
        <AuthCard mode="sign-in" />
      )}
    </AuthShell>
  );
}
