import type {
  NodeStatus,
  BlockStatus,
  InboxCategory,
  EnergyLevel,
  Difficulty,
  GoalStatus,
} from "@/types";

export interface StatusMeta {
  label: string;
  /** raw value for SVG strokes, halos, dots on the map */
  hex: string;
  /** tailwind bg class for a solid status dot */
  dot: string;
  /** tailwind text color class */
  text: string;
  /** tailwind tint + text + border for a chip/pill */
  chip: string;
}

// Near-monochrome: only three hues carry meaning — accent (live/next),
// sage (done / on track), warn (at risk / blocked). Everything else is grey.
const ACCENT = "#e6b877";
const SAGE = "#8fae9f";
const WARN = "#d5896f";
const GREY = "#595e69";

const accent: Omit<StatusMeta, "label"> = { hex: ACCENT, dot: "bg-accent", text: "text-accent", chip: "bg-accent/12 text-accent border border-accent/25" };
const sage: Omit<StatusMeta, "label"> = { hex: SAGE, dot: "bg-sage", text: "text-sage", chip: "bg-sage/12 text-sage border border-sage/25" };
const warn: Omit<StatusMeta, "label"> = { hex: WARN, dot: "bg-warn", text: "text-warn", chip: "bg-warn/12 text-warn border border-warn/25" };
const grey: Omit<StatusMeta, "label"> = { hex: GREY, dot: "bg-faint", text: "text-muted", chip: "bg-white/[0.04] text-muted border border-line" };
const dim: Omit<StatusMeta, "label"> = { hex: GREY, dot: "bg-faint", text: "text-faint", chip: "bg-white/[0.04] text-faint border border-line" };

export const nodeStatusMeta: Record<NodeStatus, StatusMeta> = {
  not_started: { label: "Not Started", ...grey },
  in_motion: { label: "In Motion", ...accent },
  blocked: { label: "Blocked", ...warn },
  at_risk: { label: "At Risk", ...warn },
  done: { label: "Done", ...sage },
};

export const blockStatusMeta: Record<BlockStatus, StatusMeta> = {
  planned: { label: "Planned", ...grey },
  in_progress: { label: "In Progress", ...accent },
  completed: { label: "Completed", ...sage },
  pushed: { label: "Pushed", ...warn },
  skipped: { label: "Skipped", ...dim },
};

export const inboxCategoryMeta: Record<InboxCategory, StatusMeta> = {
  unsorted: { label: "Unsorted", ...grey },
  must_do: { label: "Must Do", ...warn },
  high_impact: { label: "High Impact", ...accent },
  quick_win: { label: "Quick Win", ...sage },
  can_wait: { label: "Can Wait", ...grey },
  not_worth_doing: { label: "Not Worth Doing", ...dim },
};

export const inboxCategoryOrder: InboxCategory[] = [
  "must_do",
  "high_impact",
  "quick_win",
  "can_wait",
  "not_worth_doing",
];

export const energyMeta: Record<EnergyLevel, StatusMeta> = {
  low: { label: "Low", ...warn },
  normal: { label: "Normal", ...sage },
  high: { label: "High", ...accent },
};

export const difficultyMeta: Record<Difficulty, StatusMeta> = {
  light: { label: "Light", ...sage },
  moderate: { label: "Moderate", ...grey },
  deep: { label: "Deep", ...accent },
};

export const goalStatusMeta: Record<GoalStatus, StatusMeta> = {
  active: { label: "In motion", ...accent },
  paused: { label: "Paused", ...warn },
  done: { label: "Done", ...sage },
  archived: { label: "Archived", ...dim },
};
