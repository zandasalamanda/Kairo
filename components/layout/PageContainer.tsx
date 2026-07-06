import * as React from "react";
import { TopBar } from "./TopBar";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Padded, scrollable screens. Narrow column + generous whitespace. */
export function PageContainer({
  user,
  children,
  className,
}: {
  user: SessionUser;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <TopBar user={user} className="md:hidden" />
      <main className={cn("mx-auto w-full max-w-2xl px-5 pb-28 pt-6 md:px-8 md:pb-16 md:pt-12", className)}>
        {children}
      </main>
    </>
  );
}
