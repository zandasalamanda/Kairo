"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "solid" | "glass" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium tracking-tight transition-colors duration-150 select-none disabled:opacity-40 disabled:pointer-events-none active:translate-y-px focus-visible:outline-none";

const variants: Record<Variant, string> = {
  // The one accent action — "your next move". Used once per view at most.
  primary: "bg-accent text-[#1b1206] hover:bg-[#efc78a]",
  solid: "bg-white/[0.06] text-ink border border-line-strong hover:bg-white/[0.09]",
  glass: "bg-white/[0.02] text-ink border border-line hover:border-line-strong hover:bg-white/[0.04]",
  ghost: "text-muted hover:text-ink hover:bg-white/5",
  outline: "text-ink border border-line-strong hover:bg-white/5",
  danger: "text-warn border border-warn/30 bg-warn/10 hover:bg-warn/15",
};

const sizes: Record<Size, string> = {
  sm: "h-8 rounded-lg px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-10 w-10",
};

export function buttonVariants({
  variant = "glass",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "glass", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
