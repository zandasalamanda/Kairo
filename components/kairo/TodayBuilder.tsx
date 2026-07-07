"use client";

import * as React from "react";
import { Check, ArrowRight, Minimize2, Split, Repeat, Play, ChevronDown, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import type { GoalWithNodes, EnergyLevel, BlockStatus, Difficulty } from "@/types";
import { buildDailyPlan } from "@/lib/ai/build-daily-plan";
import type { DailyPlanResult } from "@/lib/ai/types";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SoftGlassCard } from "@/components/ui/SoftGlassCard";
import { Chip } from "@/components/ui/Chip";
import { useGoalColors } from "@/lib/kairo/use-goal-colors";
import { SectionLabel } from "./PageHeader";
import { cn, makeId, formatDuration } from "@/lib/utils";

interface LiveBlock {
  id: string; title: string; reason: string; startTime: string | null;
  durationMinutes: number; difficulty: Difficulty; status: BlockStatus; goalId: string | null;
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

export function TodayBuilder({ goals }: { goals: GoalWithNodes[] }) {
  const [minutes, setMinutes] = React.useState("120");
  const [energy, setEnergy] = React.useState<EnergyLevel>("normal");
  const [thinking, setThinking] = React.useState(true);
  const [plan, setPlan] = React.useState<DailyPlanResult | null>(null);
  const [blocks, setBlocks] = React.useState<LiveBlock[]>([]);
  const goalColor = useGoalColors();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const build = React.useCallback(async (m: number, e: EnergyLevel) => {
    setThinking(true);
    await new Promise((r) => setTimeout(r, 520));
    const res = await buildDailyPlan({ availableMinutes: m, energy: e, context: "", goals });
    setPlan(res);
    setBlocks(res.blocks.map((b) => ({ id: makeId("blk"), status: "planned", title: b.title, reason: b.reason, startTime: b.startTime, durationMinutes: b.durationMinutes, difficulty: b.difficulty, goalId: b.goalId })));
    setThinking(false);
  }, [goals]);

  React.useEffect(() => { void build(Number(minutes), energy); }, [minutes, energy, build]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setBlocks((p) => {
        const oi = p.findIndex((b) => b.id === active.id);
        const ni = p.findIndex((b) => b.id === over.id);
        return oi < 0 || ni < 0 ? p : arrayMove(p, oi, ni);
      });
    }
  };

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
    <div className="space-y-10">
      {/* window */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2.5">
          <SectionLabel>Available time</SectionLabel>
          <SegmentedControl options={TIME as unknown as { value: string; label: string }[]} value={minutes} onChange={setMinutes} />
        </div>
        <div className="space-y-2.5">
          <SectionLabel>Energy</SectionLabel>
          <SegmentedControl options={ENERGY as unknown as { value: EnergyLevel; label: string }[]} value={energy} onChange={setEnergy} />
        </div>
      </div>

      {/* path */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Today&apos;s path</SectionLabel>
          <span className="truncate text-[12px] text-muted">{thinking ? "Building…" : plan?.summary}</span>
        </div>

        {thinking ? (
          <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-xl bg-white/[0.03]" />)}</div>
        ) : goals.length === 0 ? (
          <SoftGlassCard className="rounded-xl px-4 py-10 text-center text-sm text-muted">
            No goals yet. <a href="/app/map" className="text-accent underline underline-offset-2">Create one on the map</a> and Aether builds your day from it.
          </SoftGlassCard>
        ) : blocks.length === 0 ? (
          <SoftGlassCard className="rounded-xl px-4 py-10 text-center text-sm text-muted">No blocks fit today. Add time or raise your energy.</SoftGlassCard>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2.5">
                {blocks.map((b, i) => <PlanBlock key={b.id} order={i + 1} block={b} act={act} hex={b.goalId ? goalColor(b.goalId) : "#595e69"} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {!thinking && blocks.length > 1 && (
          <p className="px-1 text-[11px] text-faint">Drag the handle to reorder. Aether sorts by momentum; you have the final say.</p>
        )}

        {!thinking && plan?.recoveryNote && (
          <div className="rounded-xl border border-warn/20 bg-warn/[0.06] px-4 py-3 text-[13px] text-warn">{plan.recoveryNote}</div>
        )}
      </div>
    </div>
  );
}

function PlanBlock({ block: b, order, act, hex }: { block: LiveBlock; order: number; act: Record<string, (id: string) => void>; hex: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const [open, setOpen] = React.useState(false);
  const done = b.status === "completed";
  const pushed = b.status === "pushed";
  const inProgress = b.status === "in_progress";
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-20")}>
      {/* goal color spine — ties this block to its goal on the map */}
      <span aria-hidden className="pointer-events-none absolute left-0 top-2 bottom-2 z-10 w-[3px] rounded-full" style={{ background: hex, opacity: pushed || done ? 0.4 : 1 }} />
      <SoftGlassCard
        className={cn(
          "overflow-hidden rounded-xl transition-shadow",
          pushed && "opacity-55",
          isDragging && "border-line-strong bg-surface-2 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.85)]"
        )}
      >
        <div className="flex items-stretch">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="flex shrink-0 touch-none cursor-grab items-center px-2 text-faint transition-colors hover:text-muted active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>
          <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pr-4 text-left">
            <span className="flex w-8 shrink-0 flex-col items-center leading-tight">
              <span className={cn("font-mono text-[13px]", done || pushed ? "text-faint" : "text-ink")}>{order}</span>
              <span className="font-mono text-[11px] text-faint">{formatDuration(b.durationMinutes)}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-[15px]", done ? "text-faint line-through" : pushed ? "text-muted" : "text-ink")}>{b.title}</span>
              <span className="truncate text-[12px] text-muted">{b.reason}</span>
            </span>
            {done ? (
              <span className="grid h-5 w-5 shrink-0 animate-pop place-items-center rounded-full bg-sage" style={{ boxShadow: "0 0 10px #8fae9f88" }}>
                <Check size={12} className="text-[#0d1a14]" strokeWidth={3} />
              </span>
            ) : pushed ? (
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-faint">Pushed</span>
            ) : (
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", inProgress ? "bg-accent" : "bg-faint")} />
            )}
            <ChevronDown size={16} className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")} />
          </button>
        </div>
        {open && (
          <div className="border-t border-line px-4 py-3">
            {pushed ? (
              <p className="text-[12px] text-muted">Moved to later — may slip ~1 day unless recovered.</p>
            ) : done ? (
              <p className="text-[12px] text-sage">Done — goal progress updated.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {inProgress ? (
                  <Chip tone="sage" icon={<Check size={14} />} onClick={() => act.complete(b.id)}>Complete</Chip>
                ) : (
                  <Chip tone="accent" icon={<Play size={14} />} onClick={() => act.start(b.id)}>Start</Chip>
                )}
                <Chip tone="sage" icon={<Check size={14} />} onClick={() => act.complete(b.id)}>Done</Chip>
                <Chip tone="warn" icon={<ArrowRight size={14} />} onClick={() => act.push(b.id)}>Push</Chip>
                <Chip icon={<Minimize2 size={14} />} onClick={() => act.smaller(b.id)}>Smaller</Chip>
                <Chip icon={<Split size={14} />} onClick={() => act.split(b.id)}>Split</Chip>
                <Chip icon={<Repeat size={14} />} onClick={() => act.replace(b.id)}>Replace</Chip>
              </div>
            )}
          </div>
        )}
      </SoftGlassCard>
    </div>
  );
}
