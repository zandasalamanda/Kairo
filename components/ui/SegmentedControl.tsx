"use client";

import { cn } from "@/lib/utils";

export interface Segment<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inset-well flex gap-1 rounded-xl p-1", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "flex-1 rounded-lg px-3 py-2.5 text-center transition-colors duration-150",
              active ? "raised-btn text-ink" : "text-muted hover:text-ink"
            )}
          >
            <span className="block text-sm font-medium">{opt.label}</span>
            {opt.hint && (
              <span className={cn("mt-0.5 block font-mono text-[10px] tracking-wide", active ? "text-accent" : "text-faint")}>
                {opt.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
