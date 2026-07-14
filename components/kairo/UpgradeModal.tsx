"use client";

import * as React from "react";
import Link from "next/link";
import { X, Zap, Check } from "lucide-react";
import { PRO_UPGRADE_LINES, priceDisplay } from "@/lib/kairo/plans";

/**
 * The moment-of-intent upgrade prompt — shown when a free user hits the goal cap
 * or empties their daily AI. One tap starts checkout (no dead-end toast).
 * `reason` doubles as the open flag: null = closed.
 */
export function UpgradeModal({ reason, onClose }: { reason: string | null; onClose: () => void }) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!reason) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reason, onClose]);

  if (!reason) return null;

  const upgrade = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "yearly" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) { window.location.href = data.url; return; }
      setErr(data.error ?? "Couldn't start checkout. Try again.");
    } catch {
      setErr("Couldn't reach billing. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-black/60 p-5 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Upgrade to Pro">
      <div className="chrome animate-sheet-up relative w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:text-ink" aria-label="Close"><X size={16} /></button>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-accent/20 bg-accent/5 text-accent"><Zap size={16} /></span>
          <span className="font-display text-lg font-semibold text-ink">Go Pro</span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{reason}</p>
        <ul className="mt-4 space-y-2">
          {PRO_UPGRADE_LINES.map((l) => (
            <li key={l} className="flex items-center gap-2 text-[14px] text-ink/90"><Check size={14} className="shrink-0 text-accent" />{l}</li>
          ))}
        </ul>
        <p className="mt-4 text-center text-[12px] text-faint">
          Pro is <span className="text-muted">${priceDisplay.yearlyPerMonth}/mo</span> billed yearly — about {priceDisplay.perDay} a day.
        </p>
        <button onClick={() => void upgrade()} disabled={loading} className="raised-gold mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[14px] font-medium disabled:opacity-50">
          {loading ? "Starting…" : "Upgrade to Pro"}
        </button>
        <div className="mt-2.5 text-center">
          <Link href="/app/billing" onClick={onClose} className="text-[12px] text-faint transition-colors hover:text-muted">See plans &amp; pricing</Link>
        </div>
        {err && <p className="mt-2 text-center text-[12px] text-warn">{err}</p>}
      </div>
    </div>
  );
}
