"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { track } from "@/lib/analytics";
import type { Plan } from "@/types";

const FREE = [
  "2 active goals",
  "AI goal mapping + focus sessions",
  "Real resource searches per step",
  "Pace mirror + momentum streaks",
  "Templates & shareable maps",
];
const PRO = [
  "Unlimited goals",
  "Ask Sola — your agentic plan assistant",
  "“Do it for me” drafts + the adapting map",
  "Real, hand-checked video resources",
  "Deadline forecasting & the weekly digest",
  "Priority AI + much higher limits",
];

export function BillingPlans({ plan, monthly, yearly }: { plan: Plan; monthly: number; yearly: number }) {
  const [interval, setInterval] = React.useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const price = interval === "monthly" ? monthly : yearly;
  const per = interval === "monthly" ? "mo" : "yr";

  const post = async (url: string, body?: unknown) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage(data.error ?? "Something went wrong. Try again.");
    } catch {
      setMessage("Could not reach billing. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const upgrade = () => { track("checkout_started", { interval, price }); post("/api/stripe/checkout", { interval }); };
  const manage = () => post("/api/stripe/portal");

  return (
    <div>
      <div className="mx-auto mb-6 max-w-xs">
        <SegmentedControl
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly", hint: "save 37%" },
          ]}
          value={interval}
          onChange={(v) => setInterval(v as "monthly" | "yearly")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Free */}
        <div className="panel rounded-3xl p-6">
          <div className="text-sm font-semibold text-muted">Free</div>
          <div className="mt-2 font-display text-3xl font-semibold text-ink">$0</div>
          <p className="mt-1 text-[13px] text-muted">Everything you need to start.</p>
          <ul className="mt-5 space-y-2.5">
            {FREE.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[14px] text-ink/90">
                <Check size={15} className="text-faint" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {plan === "free" ? (
              <div className="rounded-full border border-line py-2.5 text-center text-sm text-muted">Current plan</div>
            ) : (
              <Button variant="glass" className="w-full" onClick={manage} disabled={loading}>Cancel or downgrade</Button>
            )}
          </div>
        </div>

        {/* Pro */}
        <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-accent/[0.06] p-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <Zap size={15} /> Pro
          </div>
          <div className="mt-2 flex items-end gap-1">
            <span className="font-display text-3xl font-semibold text-ink">${price}</span>
            <span className="mb-1 text-[13px] text-muted">/{per}</span>
          </div>
          <p className="mt-1 text-[13px] text-muted">Everything in Free, plus the AI that does the work with you.</p>
          <ul className="mt-5 space-y-2.5">
            {PRO.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[14px] text-ink">
                <Check size={15} className="text-accent" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {plan === "pro" ? (
              <Button variant="primary" className="w-full" size="lg" onClick={manage} disabled={loading}>
                {loading ? "Opening…" : "Manage billing"}
              </Button>
            ) : (
              <Button variant="primary" className="w-full" size="lg" onClick={upgrade} disabled={loading}>
                {loading ? "Starting…" : "Upgrade to Pro"}
              </Button>
            )}
          </div>
          {plan === "free" && (
            <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">
              Renews automatically at ${price}/{per} until you cancel. Cancel anytime from Settings. See our{" "}
              <Link href="/terms" className="underline transition-colors hover:text-muted">Terms</Link>.
            </p>
          )}
        </div>
      </div>

      {message && <p className="mt-4 text-center text-[13px] text-warn">{message}</p>}
    </div>
  );
}
