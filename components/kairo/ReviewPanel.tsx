"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReviewResult } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export function ReviewPanel({ review }: { review: ReviewResult }) {
  const [flash, setFlash] = React.useState<string | null>(null);
  const ping = (m: string) => { setFlash(m); window.setTimeout(() => setFlash((f) => (f === m ? null : f)), 2400); };
  const onTrack = review.risks.length === 0;

  return (
    <div className="max-w-xl">
      {/* summary */}
      <p className="font-display text-[22px] font-medium leading-snug text-ink md:text-[26px]">{review.summary}</p>
      <p className={cn("mt-3 text-[14px]", onTrack ? "text-sage" : "text-warn")}>{review.recoverability}</p>

      {/* moved */}
      {review.changes.length > 0 && (
        <Block label="What moved">
          {review.changes.map((c, i) => <Line key={i} dot="bg-sage">{c}</Line>)}
        </Block>
      )}

      {/* at risk */}
      {review.risks.length > 0 && (
        <Block label="At risk">
          {review.risks.map((r, i) => <Line key={i} dot="bg-warn">{r}</Line>)}
        </Block>
      )}

      {/* next best move */}
      <div className="mt-9 border-t border-line pt-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent/80">Next best move</div>
        <p className="mt-2 text-[17px] text-ink">{review.nextBestMove}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button onClick={() => ping("Recovery block added to Today.")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-[#1b1206] transition-all hover:brightness-105">
            Add recovery block
          </button>
          <Link href="/app/today" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-5 text-sm text-ink transition-colors hover:bg-white/5">
            Rebuild today <ArrowRight size={15} />
          </Link>
        </div>
        {flash && <p className="mt-3 text-[13px] text-sage">{flash}</p>}
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">{label}</div>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function Line({ dot, children }: { dot: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px] text-ink/90">
      <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      {children}
    </li>
  );
}
