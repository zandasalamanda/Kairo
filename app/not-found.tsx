import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/kairo/Logo";
import { OrbBackground } from "@/components/kairo/OrbBackground";

export default function NotFound() {
  return (
    <div className="relative grid min-h-[100dvh] place-items-center px-6 text-center">
      <OrbBackground />
      <div className="animate-fade-up">
        <div className="flex justify-center">
          <Logo size={32} />
        </div>
        <div className="mt-10 font-mono text-[13px] uppercase tracking-[0.2em] text-faint">404</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">Off the map</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] text-muted">This page doesn&apos;t exist. Head back home.</p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-[#1b1206] transition-all hover:brightness-105"
        >
          Back home <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
