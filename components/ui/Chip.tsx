"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "sage" | "warn";

const activeColor: Record<Tone, string> = {
  neutral: "text-ink",
  accent: "text-accent",
  sage: "text-sage",
  warn: "text-warn",
};
const idleHover: Record<Tone, string> = {
  neutral: "hover:text-ink",
  accent: "hover:text-accent",
  sage: "hover:text-sage",
  warn: "hover:text-warn",
};

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  active?: boolean;
  icon?: React.ReactNode;
}

export function Chip({ tone = "neutral", active = false, icon, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "raised-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium",
        active ? activeColor[tone] : cn("text-muted", idleHover[tone]),
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
