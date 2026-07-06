import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./Logo";
import { Input } from "@/components/ui/Input";
import { isDemoMode } from "@/lib/config";

export function AuthCard({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signIn = mode === "sign-in";
  const dest = signIn ? "/app/today" : "/onboarding";
  const title = signIn ? "Welcome back" : "Create your account";
  const subtitle = signIn ? "Pick up where your plan left off." : "Map your first goal in under a minute.";

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex justify-center">
        <Link href="/"><Logo size={30} /></Link>
      </div>

      <div className="panel-2 rounded-3xl p-7">
        <h1 className="text-center font-display text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-1.5 text-center text-sm text-muted">{subtitle}</p>

        <div className="mt-6 space-y-2.5">
          <Link href={dest} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white/[0.03] text-sm font-medium text-ink transition-colors hover:bg-white/[0.06]">
            Continue with Google
          </Link>
          <Link href={dest} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white/[0.03] text-sm font-medium text-ink transition-colors hover:bg-white/[0.06]">
            Continue with Apple
          </Link>
        </div>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-faint">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <div className="space-y-2.5">
          <Input type="email" placeholder="you@email.com" autoComplete="email" />
          <Input type="password" placeholder="Password" autoComplete={signIn ? "current-password" : "new-password"} />
          <Link
            href={dest}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-[#1b1206] transition-all hover:brightness-105"
          >
            {signIn ? "Sign in" : "Create account"} <ArrowRight size={16} />
          </Link>
        </div>

        <p className="mt-5 text-center text-[13px] text-muted">
          {signIn ? "New to Kairo? " : "Already have an account? "}
          <Link href={signIn ? "/sign-up" : "/sign-in"} className="text-accent hover:underline">
            {signIn ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </div>

      {isDemoMode && (
        <p className="mt-4 text-center font-mono text-[11px] text-faint">
          Demo mode · auth is bypassed. Add Clerk keys to enable real sign-in.
        </p>
      )}
    </div>
  );
}
