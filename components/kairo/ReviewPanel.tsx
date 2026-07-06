"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, AlertTriangle, ShieldCheck, ArrowRight, LifeBuoy } from "lucide-react";
import type { ReviewResult } from "@/lib/ai/types";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "./PageHeader";
import { cn } from "@/lib/utils";

export function ReviewPanel({ review }: { review: ReviewResult }) {
  const [flash, setFlash] = React.useState<string | null>(null);
  const ping = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 2600);
  };
  const onTrack = review.risks.length === 0;

  return (
    <div className="space-y-5">
      {/* summary hero */}
      <div className="panel relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <SectionLabel className="mb-2">The plan, maintained by Kairo</SectionLabel>
        <p className="max-w-2xl font-display text-xl font-medium leading-snug text-ink md:text-2xl">{review.summary}</p>
        <div className={cn("mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px]", onTrack ? "border-sage/25 bg-sage/5 text-sage" : "border-warn/25 bg-warn/5 text-warn")}>
          <ShieldCheck size={14} /> {review.recoverability}
        </div>
      </div>

      {/* sections */}
      <div className="grid gap-4 md:grid-cols-2">
        <ReviewList icon={<TrendingUp size={16} className="text-sage" />} title="What moved" items={review.changes} tone="sage" emptyLabel="Nothing yet — build today to get moving." />
        <ReviewList
          icon={<AlertTriangle size={16} className="text-warn" />}
          title="What's at risk"
          items={review.risks}
          tone="warn"
          emptyLabel="All clear. Nothing is slipping."
        />
      </div>

      {/* next best move */}
      <div className="panel rounded-3xl border-accent/15 p-6">
        <SectionLabel className="mb-2 text-accent/80">Next best move</SectionLabel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-display text-lg font-medium text-ink">{review.nextBestMove}</p>
          <Button variant="primary" onClick={() => ping("Recovery block added to Today.")}>
            <LifeBuoy size={16} /> Add recovery block
          </Button>
        </div>
      </div>

      {flash && (
        <div className="animate-fade-in rounded-xl border border-sage/20 bg-sage/5 px-4 py-2.5 text-center text-[13px] text-sage">
          {flash}
        </div>
      )}

      {/* actions */}
      <div className="flex flex-wrap gap-2.5">
        <Button variant="solid" onClick={() => ping("Plan accepted. Kairo will keep it moving.")}>Accept updated plan</Button>
        <Link href="/app/today" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-sm text-ink transition-colors hover:bg-white/5">
          Rebuild plan <ArrowRight size={15} />
        </Link>
        <Link href="/app/map" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-sm text-ink transition-colors hover:bg-white/5">
          Review goal map
        </Link>
      </div>
    </div>
  );
}

function ReviewList({
  icon,
  title,
  items,
  tone,
  emptyLabel,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: "sage" | "warn";
  emptyLabel: string;
}) {
  return (
    <div className="panel rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-muted">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink/90">
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tone === "sage" ? "bg-sage" : "bg-warn")} />
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
