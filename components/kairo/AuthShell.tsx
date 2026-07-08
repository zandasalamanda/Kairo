import * as React from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { OrbBackground } from "./OrbBackground";
import { LivingGoalMap } from "./LivingGoalMap";
import { buildSeed } from "@/lib/mock/seed";

/** Branded split layout for auth: brand panel (with the signature map) + form. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const goal = buildSeed().goals[0];
  return (
    <div className="relative min-h-screen md:grid md:grid-cols-[1.05fr_1fr]">
      <OrbBackground />

      {/* brand panel — desktop */}
      <div className="relative hidden overflow-hidden border-r border-line md:flex md:flex-col md:justify-between md:p-12">
        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.13]">
          <LivingGoalMap goal={goal} className="w-[130%] max-w-none" />
        </div>
        <Link href="/" className="relative w-fit">
          <Logo size={30} />
        </Link>
        <div className="relative max-w-md">
          <h1 className="font-display text-[42px] font-semibold leading-[1.05] tracking-tight text-ink">
            Chart it. Focus.
            <br />
            Arrive.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted">
            Tell Solaspace a goal. It maps the whole path — then walks it with you, step by step.
          </p>
        </div>
        <p className="relative font-mono text-[12px] uppercase tracking-[0.18em] text-faint">Your best next move, mapped.</p>
      </div>

      {/* form column */}
      <div className="relative grid place-items-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center md:hidden">
            <Link href="/">
              <Logo size={30} />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
