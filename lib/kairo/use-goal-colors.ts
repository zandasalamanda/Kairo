"use client";

import * as React from "react";
import { loadPersisted } from "@/lib/store/persist";
import { goalColorHex, GOAL_COLORS_KEY } from "./goal-color";

/**
 * Resolves a goal's color anywhere in the app, honoring the user's per-goal
 * choice made on the map (stored in localStorage) and falling back to the
 * stable default. Stays in sync across tabs via the storage event.
 */
export function useGoalColors(): (goalId: string) => string {
  const [overrides, setOverrides] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    const read = () => setOverrides(loadPersisted<Record<string, number>>(GOAL_COLORS_KEY) ?? {});
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === GOAL_COLORS_KEY) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return React.useCallback((goalId: string) => goalColorHex(goalId, overrides[goalId]), [overrides]);
}
