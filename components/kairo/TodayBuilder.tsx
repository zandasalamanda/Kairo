"use client";

import * as React from "react";
import { Sparkle, RefreshCw } from "lucide-react";
import type { GoalWithNodes, EnergyLevel } from "@/types";
import { buildDailyPlan } from "@/lib/ai/build-daily-plan";
import type { DailyPlanResult } from "@/lib/ai/types";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "./PageHeader";
import { DailyPlanBlock, type LivePlanBlock, type BlockActions } from "./DailyPlanBlock";
import { cn, makeId, formatDuration } from "@/lib/utils";

const TIME_PRESETS = [
  { value: "30", label: "30 min", hint: "quick" },
  { value: "60", label: "1 hour", hint: "focused" },
  { value: "120", label: "2 hours", hint: "deep" },
  { value: "custom", label: "Custom", hint: "set it" },
] as const;

const ENERGY = [
  { value: "low", label: "Low", hint: "recover" },
  { value: "normal", label: "Normal", hint: "steady" },
  { value: "high", label: "High", hint: "locked in" },
] as const;

function toLive(b: DailyPlanResult["blocks"][number]): LivePlanBlock {
  return { id: makeId("blk"), status: "planned", ...b };
}

export function TodayBuilder({ goals }: { goals: GoalWithNodes[] }) {
  const [preset, setPreset] = React.useState<string>("120");
  const [customMin, setCustomMin] = React.useState(90);
  const [energy, setEnergy] = React.useState<EnergyLevel>("normal");
  const [context, setContext] = React.useState("");
  const [building, setBuilding] = React.useState(true);
  const [plan, setPlan] = React.useState<DailyPlanResult | null>(null);
  const [blocks, setBlocks] = React.useState<LivePlanBlock[]>([]);

  const minutes = preset === "custom" ? customMin : Number(preset);

  const build = React.useCallback(async () => {
    setBuilding(true);
    await new Promise((r) => setTimeout(r, 620));
    const res = await buildDailyPlan({ availableMinutes: minutes, energy, context, goals });
    setPlan(res);
    setBlocks(res.blocks.map(toLive));
    setBuilding(false);
  }, [minutes, energy, context, goals]);

  React.useEffect(() => {
    void build();
    // build once on mount; rebuilds are explicit via the button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (id: string, fn: (b: LivePlanBlock) => LivePlanBlock) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? fn(b) : b)));

  const actions: BlockActions = {
    onStart: (id) => setBlocks((prev) => prev.map((b) => ({ ...b, status: b.id === id ? "in_progress" : b.status === "in_progress" ? "planned" : b.status }))),
    onComplete: (id) => update(id, (b) => ({ ...b, status: "completed" })),
    onPush: (id) => update(id, (b) => ({ ...b, status: "pushed" })),
    onSmaller: (id) =>
      update(id, (b) => ({
        ...b,
        durationMinutes: Math.max(10, Math.round(b.durationMinutes / 2 / 5) * 5),
        title: b.title.startsWith("Make a start") ? b.title : `Make a start: ${b.title.toLowerCase()}`,
        difficulty: "light",
      })),
    onSplit: (id) =>
      setBlocks((prev) => {
        const i = prev.findIndex((b) => b.id === id);
        if (i < 0) return prev;
        const b = prev[i];
        const half = Math.max(10, Math.round(b.durationMinutes / 2 / 5) * 5);
        const a: LivePlanBlock = { ...b, id: makeId("blk"), durationMinutes: half, title: `${b.title} (1/2)` };
        const c: LivePlanBlock = { ...b, id: makeId("blk"), durationMinutes: half, title: `${b.title} (2/2)`, startTime: null };
        return [...prev.slice(0, i), a, c, ...prev.slice(i + 1)];
      }),
    onReplace: (id) =>
      update(id, (b) => ({
        ...b,
        title: "Plan & tidy instead",
        reason: "Swapped for lower-lift work to match your energy.",
        difficulty: "light",
        durationMinutes: Math.min(b.durationMinutes, 20),
      })),
  };

  const planned = blocks.filter((b) => b.status !== "pushed" && b.status !== "skipped").reduce((s, b) => s + b.durationMinutes, 0);

  return (
    <div className="space-y-6">
      {/* Builder inputs */}
      <div className="panel rounded-2xl p-5 md:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <SectionLabel className="mb-2.5">Available time</SectionLabel>
            <SegmentedControl options={TIME_PRESETS as unknown as { value: string; label: string; hint?: string }[]} value={preset} onChange={setPreset} />
            {preset === "custom" && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={15}
                  max={300}
                  step={5}
                  value={customMin}
                  onChange={(e) => setCustomMin(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent"
                />
                <span className="w-16 text-right font-mono text-sm text-ink">{formatDuration(customMin)}</span>
              </div>
            )}
          </div>
          <div>
            <SectionLabel className="mb-2.5">Energy</SectionLabel>
            <SegmentedControl options={ENERGY as unknown as { value: EnergyLevel; label: string; hint?: string }[]} value={energy} onChange={setEnergy} />
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel className="mb-2.5">Anything unusual today?</SectionLabel>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Call at 2pm, low on sleep, want to focus on the launch…"
            className="min-h-[64px]"
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="hidden text-[13px] text-muted sm:block">
            Kairo builds around <span className="text-ink">{formatDuration(minutes)}</span> and{" "}
            <span className="text-ink">{energy}</span> energy.
          </p>
          <Button variant="primary" size="lg" onClick={build} disabled={building} className="ml-auto">
            <Sparkle size={16} />
            {building ? "Building…" : "Build Today"}
          </Button>
        </div>
      </div>

      {/* Plan */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <SectionLabel>Best path for today</SectionLabel>
            <p className="mt-1 text-sm text-muted">{plan?.summary ?? "Building your plan…"}</p>
          </div>
          {!building && plan && blocks.length > 0 && (
            <span className="font-mono text-[11px] text-faint">{formatDuration(planned)} planned</span>
          )}
        </div>

        {building ? (
          <BuildingState />
        ) : blocks.length === 0 ? (
          <div className="panel rounded-2xl p-8 text-center text-sm text-muted">
            No blocks fit today. Add more time, raise your energy, or make a task smaller.
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((b) => (
              <DailyPlanBlock key={b.id} block={b} actions={actions} />
            ))}
          </div>
        )}

        {!building && plan && (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-line bg-white/[0.02] px-4 py-3 text-[13px] text-muted">
              <RefreshCw size={14} className="mt-0.5 shrink-0 text-accent" />
              <span>{plan.explanation}</span>
            </div>
            {plan.recoveryNote && (
              <div className="rounded-xl border border-warn/20 bg-warn/5 px-4 py-3 text-[13px] text-warn">
                {plan.recoveryNote}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BuildingState() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="panel flex items-center gap-4 rounded-2xl p-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
            <div className="h-2.5 w-2/3 animate-pulse rounded bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}
