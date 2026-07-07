// One quiet, premium color per goal — shared across the map and every other
// tab so a goal (and its tasks) read the same everywhere. Desaturated tones so
// the app stays calm rather than rainbow.

export const GOAL_PALETTE = [
  { name: "Gold", hex: "#e6b877" },
  { name: "Sage", hex: "#8fae9f" },
  { name: "Coral", hex: "#d5896f" },
  { name: "Periwinkle", hex: "#9aa6d4" },
  { name: "Lilac", hex: "#c39bd0" },
  { name: "Teal", hex: "#7fb0ad" },
  { name: "Amber", hex: "#d9a86c" },
  { name: "Rose", hex: "#cf9ba6" },
] as const;

/** localStorage key for per-goal color overrides ({ goalId: paletteIndex }). */
export const GOAL_COLORS_KEY = "kairo.colors.v1";

/** Stable default palette slot for a goal, from its id. */
export function goalColorIndex(goalId: string): number {
  let h = 0;
  for (let i = 0; i < goalId.length; i++) h = (h * 31 + goalId.charCodeAt(i)) >>> 0;
  return h % GOAL_PALETTE.length;
}

/** The hex for a goal — the user's chosen slot if set, else the stable default. */
export function goalColorHex(goalId: string, override?: number): string {
  const raw = override ?? goalColorIndex(goalId);
  const idx = ((raw % GOAL_PALETTE.length) + GOAL_PALETTE.length) % GOAL_PALETTE.length;
  return GOAL_PALETTE[idx].hex;
}
