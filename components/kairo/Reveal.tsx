"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Reveals its children with a gentle rise-and-fade the first time they scroll
 * into view. Renders a plain <div>, so it can stand in for a section wrapper or
 * a grid item without changing layout. Degrades to instantly-visible when
 * IntersectionObserver is unavailable, and respects reduced motion (the shared
 * fade-up keyframe is subtle and one-shot).
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer (very old browser): just show it. Not a render loop.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(className, shown ? "animate-fade-up" : "opacity-0")}
      style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
