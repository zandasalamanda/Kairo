"use client";

import * as React from "react";
import { Check, ArrowRight, Minimize2, Split, Repeat, Play } from "lucide-react";
import type { GoalWithNodes, EnergyLevel, BlockStatus, Difficulty } from "@/types";
import { buildDailyPlan } from "@/lib/ai/build-daily-plan";
import type { DailyPlanResult } from "@/lib/ai/types";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn, makeId, formatDuration, formatClock } from "@/lib/utils";

interface LiveBlock {
  id: string;
  title: string;
  reason: string;
  startTime: string | null;
  durationMinutes: number;
  difficulty: Difficulty;
  status: BlockStatus;
}

const TIME = [
  { value: "30", label: "30m" },
  { value: "60", label: "1h" },
  { value: "120", label: "2h" },
] as const;
const ENERGY = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
] as const;

const STATUS_TINT: Record<BlockStatus, string> = {
  planned: "bg-faint",
  in_progress: "bg-accent",
  completed: "bg-sage",
  pushed: "bg-warn",
  skipped: "bg-faint",
};

export function TodayBuilder({ goals }: { goals: GoalWithNodes[] }) {
  const [minutes, setMinutes] = React.useState("120");
  const [energy, setEnergy] = React.useState<EnergyLevel>("normal");
  const [thinking, setThinking] = React.useState(true);
  const [plan, setPlan] = React.useState<DailyPlanResult | null>(null);
  const [blocks, setBlocks] = React.useState<LiveBlock[]>([]);
  const [open, setOpen] = React.useState<string | null>(null);

  const build = React.useCallback(async (m: number, e: EnergyLevel) => {
    setThinking(true);
    await new Promise((r) => setTimeout(r, 520));
    const res = await buildDailyPlan({ availableMinutes: m, energy: e, context: "", goals });
    setPlan(res);
    setBlocks(res.blocks.map((b) => ({ id: makeId("blk"), status: "planned", title: b.title, reason: b.reason, startTime: b.startTime, durationMinutes: b.durationMinutes, difficulty: b.difficulty })));
    setThinking(false);
  }, [goals]);

  React.useEffect(() => { void build(Number(minutes), energy); }, [minutes, energy, build]);

  const update = (id: string, fn: (b: LiveBlock) => LiveBlock) => setBlocks((p) => p.map((b) => (b.id === id ? fn(b) : b)));
  const act = {
    start: (id: string) => setBlocks((p) => p.map((b) => ({ ...b, status: b.id === id ? "in_progress" : b.status === "in_progress" ? "planned" : b.status }))),
    complete: (id: string) => update(id, (b) => ({ ...b, status: "completed" })),
    push: (id: string) => update(id, (b) => ({ ...b, status: "pushed" })),
    smaller: (id: string) => update(id, (b) => ({ ...b, durationMinutes: Math.max(10, Math.round(b.durationMinutes / 2 / 5) * 5), difficulty: "light", title: b.title.startsWith("Make a start") ? b.title : `Make a start: ${b.title.toLowerCase()}` })),
    split: (id: string) => setBlocks((p) => {
      const i = p.findIndex((b) => b.id === id); if (i < 0) return p;
      const b = p[i]; const h = Math.max(10, Math.round(b.durationMinutes / 2 / 5) * 5);
      return [...p.slice(0, i), { ...b, id: makeId("blk"), durationMinutes: h, title: `${b.title} (1/2)` }, { ...b, id: makeId("blk"), durationMinutes: h, title: `${b.title} (2/2)`, startTime: null }, ...p.slice(i + 1)];
    }),
    replace: (id: string) => update(id, (b) => ({ ...b, title: "Plan & tidy instead", reason: "Swapped for lower-lift work.", difficulty: "light", durationMinutes: Math.min(b.durationMinutes, 20) })),
  };

  return (
    <div>
      {/* controls */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <SegmentedControl options={TIME as unknown as { value: string; label: string }[]} value={minutes} onChange={setMinutes} />
        <SegmentedControl options={ENERGY as unknown as { value: EnergyLevel; label: string }[]} value={energy} onChange={setEnergy} />
      </div>

      {/* plan */}
      <p className="mb-4 text-[13px] text-muted">{thinking ? "Kairo is building your day…" : plan?.summary}</p>

      {thinking ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />)}
        </div>
      ) : blocks.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No blocks fit today. Add time or raise your energy.</p>
      ) : (
        <ul className="divide-y divide-line">
          {blocks.map((b) => {
            const done = b.status === "completed";
            const pushed = b.status === "pushed";
            const expanded = open === b.id;
            return (
              <li key={b.id}>
                <button
                  onClick={() => setOpen(expanded ? null : b.id)}
                  className="flex w-full items-center gap-4 py-4 text-left"
                >
                  <span className="w-14 shrink-0 font-mono text-[12px] text-faint">{formatClock(b.startTime) || `${b.durationMinutes}m`}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[15px]", done ? "text-faint line-through" : "text-ink")}>{b.title}</span>
                    <span className="text-[12px] text-muted">{b.reason}</span>
                  </span>
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_TINT[b.status])} />
                </button>
                {expanded && !done && !pushed && (
                  <div className="flex flex-wrap gap-1.5 pb-4">
                    <Act icon={<Play size={13} />} label={b.status === "in_progress" ? "Complete" : "Start"} onClick={() => (b.status === "in_progress" ? act.complete(b.id) : act.start(b.id))} tone="accent" />
                    <Act icon={<Check size={13} />} label="Done" onClick={() => act.complete(b.id)} tone="sage" />
                    <Act icon={<ArrowRight size={13} />} label="Push" onClick={() => act.push(b.id)} tone="warn" />
                    <Act icon={<Minimize2 size={13} />} label="Smaller" onClick={() => act.smaller(b.id)} />
                    <Act icon={<Split size={13} />} label="Split" onClick={() => act.split(b.id)} />
                    <Act icon={<Repeat size={13} />} label="Replace" onClick={() => act.replace(b.id)} />
                  </div>
                )}
                {expanded && pushed && <p className="pb-4 text-[12px] text-warn">Moved to later. Timeline may slip ~1 day unless recovered.</p>}
                {expanded && done && <p className="pb-4 text-[12px] text-sage">Done — goal progress updated.</p>}
              </li>
            );
          })}
        </ul>
      )}

      {!thinking && plan?.recoveryNote && (
        <p className="mt-6 border-t border-line pt-4 text-[13px] text-warn">{plan.recoveryNote}</p>
      )}
    </div>
  );
}

function Act({ icon, label, onClick, tone = "muted" }: { icon: React.ReactNode; label: string; onClick: () => void; tone?: "muted" | "accent" | "sage" | "warn" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-muted transition-colors",
        tone === "accent" && "hover:border-accent/40 hover:text-accent",
        tone === "sage" && "hover:border-sage/40 hover:text-sage",
        tone === "warn" && "hover:border-warn/40 hover:text-warn",
        tone === "muted" && "hover:border-line-strong hover:text-ink"
      )}
    >
      {icon} {label}
    </button>
  );
}
