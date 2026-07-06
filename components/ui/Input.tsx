import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-xl border border-line bg-white/[0.02] text-ink placeholder:text-faint transition-colors focus:border-accent/45 focus:bg-white/[0.04] focus-visible:outline-none";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(field, "h-11 px-4 text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-[92px] resize-none px-4 py-3 text-sm leading-relaxed", className)} {...props} />;
}
