"use client";

import * as React from "react";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types";

const FREE = ["2 active goals", "Basic goal maps", "Daily planning", "Idea inbox", "Simple review"];
const PRO = [
  "Unlimited goals",
  "Advanced AI planning",
  "Deeper weekly reviews",
  "AI inbox sorting",
  "Timeline forecasting",
  "Custom planning styles",
];

export function BillingPlans({ plan, monthly, yearly }: { plan: Plan; monthly: number; yearly: number }) {
  const [interval, setInterval] = React.useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const price = interval === "monthly" ? monthly : yearly;

  const upgrade = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage(data.error ?? "Could not start checkout.");
    } catch {
      setMessage("Could not reach checkout. Try again.");
    } finally {
      setLoading(false);
    }
  };

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
              <Button variant="glass" className="w-full">Downgrade</Button>
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
            <span className="mb-1 text-[13px] text-muted">/{interval === "monthly" ? "mo" : "yr"}</span>
          </div>
          <p className="mt-1 text-[13px] text-muted">For goals that deserve real momentum.</p>
          <ul className="mt-5 space-y-2.5">
            {PRO.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[14px] text-ink">
                <Check size={15} className="text-accent" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Button variant="primary" className="w-full" size="lg" onClick={upgrade} disabled={loading}>
              {loading ? "Starting…" : `Upgrade to Pro`}
            </Button>
          </div>
          {message && (
            <p className={cn("mt-3 text-center text-[12px]", "text-warn")}>{message}</p>
          )}
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wide text-faint">Stripe · test mode</p>
        </div>
      </div>
    </div>
  );
}
