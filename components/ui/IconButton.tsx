"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "raised-btn grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:text-ink",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
