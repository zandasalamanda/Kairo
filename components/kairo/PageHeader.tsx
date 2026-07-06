import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[13px] font-medium text-muted">{eyebrow}</div>}
        <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink md:text-[32px] md:leading-[1.1]">
          {title}
        </h1>
        {description && <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] font-medium uppercase tracking-[0.14em] text-faint", className)}>{children}</div>
  );
}
