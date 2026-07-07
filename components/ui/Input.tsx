import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "inset-well w-full rounded-xl text-ink placeholder:text-faint transition-colors focus:border-accent/45 focus-visible:outline-none";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(field, "h-11 px-4 text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-[92px] resize-none px-4 py-3 text-sm leading-relaxed", className)} {...props} />;
}
