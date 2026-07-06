import * as React from "react";
import { cn } from "@/lib/utils";

interface SoftGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** raise contrast slightly for a more prominent surface */
  tone?: "flat" | "raised";
  /** the one focal treatment — a restrained accent lift. Use sparingly. */
  focal?: boolean;
  as?: "div" | "section" | "article";
}

export function SoftGlassCard({
  className,
  tone = "flat",
  focal = false,
  as: Tag = "div",
  children,
  ...props
}: SoftGlassCardProps) {
  return (
    <Tag
      className={cn(
        "relative overflow-hidden rounded-2xl",
        tone === "raised" ? "panel-2" : "panel",
        focal && "focus-accent",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
