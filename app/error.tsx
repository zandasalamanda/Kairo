"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Integration point: report to an error service (Sentry, etc.).
    console.error(error);
  }, [error]);

  return (
    <div className="relative grid min-h-[100dvh] place-items-center px-6 text-center">
      <div className="animate-fade-up">
        <div className="font-mono text-[13px] uppercase tracking-[0.2em] text-faint">Unexpected error</div>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Something slipped</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] text-muted">Solaspace hit a snag rendering this view. Give it another go.</p>
        <button
          onClick={reset}
          className="raised-gold mt-8 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-medium"
        >
          <RotateCcw size={15} /> Try again
        </button>
      </div>
    </div>
  );
}
