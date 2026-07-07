"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "solid" | "glass" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium tracking-tight select-none disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none";

const variants: Record<Variant, string> = {
  // The one accent action — "your next move". Used once per view at most.
  primary: "raised-gold",
  solid: "raised-btn text-ink",
  glass: "raised-btn text-ink",
  ghost: "text-muted transition-colors hover:text-ink hover:bg-white/5",
  outline: "raised-btn text-ink",
  danger: "raised-btn text-warn",
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
