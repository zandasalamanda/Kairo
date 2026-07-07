import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";

/** Shared shell for the privacy / terms pages — quiet, readable prose. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-2xl px-5 py-10">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
          <ArrowLeft size={15} /> Back
        </Link>
      </div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 font-mono text-[12px] text-faint">Last updated: {updated}</p>
      <div className="legal mt-8 space-y-6 text-[15px] leading-relaxed text-muted">{children}</div>
    </div>
  );
}

/** A titled section within a legal page. */
export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="font-display text-lg font-semibold text-ink">{heading}</h2>
      {children}
    </section>
  );
}
