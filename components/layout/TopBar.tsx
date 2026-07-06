import Link from "next/link";
import { Logo } from "@/components/kairo/Logo";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

export function TopBar({ user, className }: { user: SessionUser; className?: string }) {
  return (
    <header className={cn("sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/70 px-4 py-3 backdrop-blur-xl", className)}>
      <Link href="/app/today" aria-label="Kairo home">
        <Logo size={24} />
      </Link>
      <Link
        href="/app/settings"
        className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/[0.06] text-[13px] font-semibold text-ink"
        aria-label="Settings"
      >
        {user.initials}
      </Link>
    </header>
  );
}
