"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2", className)}>
      <div className="mx-auto flex max-w-md items-center justify-around rounded-2xl border border-line bg-canvas-2/85 p-1.5 backdrop-blur-xl">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
                active ? "text-ink" : "text-muted"
              )}
            >
              <Icon size={19} strokeWidth={2} className={active ? "text-accent" : ""} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
