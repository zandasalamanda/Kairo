import * as React from "react";
import { OrbBackground } from "@/components/kairo/OrbBackground";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import type { SessionUser } from "@/lib/auth";

/**
 * App frame. Deliberately thin: a fixed sidebar (desktop) and bottom nav
 * (mobile), and a bare content slot. Pages own their own layout —
 * padded scroll pages via <PageContainer>, or full-bleed (the map).
 */
export function KairoShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh]">
      <OrbBackground />
      <Sidebar user={user} className="hidden md:flex" />
      <div className="min-h-[100dvh] md:pl-[248px]">{children}</div>
      <BottomNav className="md:hidden" />
    </div>
  );
}
