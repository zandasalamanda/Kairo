import * as React from "react";
import { OrbBackground } from "@/components/kairo/OrbBackground";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import type { SessionUser } from "@/lib/auth";
import type { NextMove } from "@/lib/kairo/next-move";

/**
 * App frame. Deliberately thin: a fixed sidebar (desktop) and bottom nav
 * (mobile) that both surface the single next move, plus a bare content slot.
 * Pages own their layout — padded via <PageContainer>, or full-bleed (the map).
 */
export function KairoShell({
  user,
  nextMove,
  usage,
  children,
}: {
  user: SessionUser;
  nextMove: NextMove | null;
  usage?: { dayUsed: number; dayLimit: number } | null;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh]">
      <OrbBackground />
      <Sidebar user={user} nextMove={nextMove} usage={usage} className="hidden md:flex" />
      <div className="min-h-[100dvh] md:pl-[248px]">{children}</div>
      <BottomNav nextMove={nextMove} className="md:hidden" />
    </div>
  );
}
