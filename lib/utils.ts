import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** "25m", "1h", "1h 30m" from a minute count. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** ISO / "HH:MM" time string -> "3:30 PM". Returns "" when absent. */
export function formatClock(value?: string | null): string {
  if (!value) return "";
  let d: Date;
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    d = new Date(2000, 0, 1, h, m);
  } else {
    d = new Date(value);
  }
  if (Number.isNaN(d.getTime())) return value;
  return d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(":00", ":00");
}

/** 0..100 -> "72%". */
export function pct(n: number): string {
  return `${Math.round(clampPct(n))}%`;
}

export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** First-letter initials, max two. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Stable-ish id without external deps (safe for mock/client rows). */
export function makeId(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}_${time}${rand}`;
}

/**
 * A real UUID for new persisted rows — client-generated so the optimistic id
 * matches the Supabase primary key exactly (no reconciliation on reload).
 */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback for very old runtimes (RFC-4122-ish, non-cryptographic).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Shorten to `max` chars on a word boundary, adding an ellipsis. */
export function truncate(text: string, max = 32): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

/** "in 12 days" / "in 3 weeks" / "today" relative to now. */
export function relativeDays(target?: string | null): string {
  if (!target) return "";
  const d = new Date(target);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 14) return `in ${diff}d`;
  if (diff < 60) return `in ${Math.round(diff / 7)}w`;
  return `in ${Math.round(diff / 30)}mo`;
}
