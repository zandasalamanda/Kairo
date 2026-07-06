"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUp, Check, Play, CalendarPlus, X, ChevronDown, Locate } from "lucide-react";
import type { GoalWithNodes, GoalNode, NodeStatus } from "@/types";
import { nodeStatusMeta } from "@/lib/kairo/status";
import { cn, formatDuration, makeId } from "@/lib/utils";

interface Placed {
  node: GoalNode;
  x: number;
  y: number;
  delay: number;
}

const GOLDEN = 2.399963229;

function layout(nodes: GoalNode[]): Placed[] {
  return nodes.map((node, i) => {
    const angle = i * GOLDEN - Math.PI / 2;
    const r = 232 + 34 * Math.sin(i * 2.7);
    return { node, x: Math.cos(angle) * r, y: Math.sin(angle) * r, delay: (i % 6) * 0.5 };
  });
}

function nextId(nodes: GoalNode[]): string | null {
  return (
    nodes.find((n) => n.status === "in_motion")?.id ??
    nodes.find((n) => n.status === "at_risk")?.id ??
    nodes.find((n) => n.status === "not_started")?.id ??
    null
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function LiveMap({ goals: initialGoals }: { goals: GoalWithNodes[] }) {
  const [goals, setGoals] = React.useState(initialGoals);
  const [gi, setGi] = React.useState(0);
  const goal = goals[gi];

  const [view, setView] = React.useState({ tx: 0, ty: 0, scale: 1 });
  const [animating, setAnimating] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newIds, setNewIds] = React.useState<Set<string>>(new Set());
  const [prompt, setPrompt] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const pointers = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = React.useRef<{ dist: number; scale: number } | null>(null);
  const moved = React.useRef(false);

  const placed = React.useMemo(() => layout(goal.nodes), [goal.nodes]);
  const nId = nextId(goal.nodes);
  const selected = goal.nodes.find((n) => n.id === selectedId) ?? null;
  const dirty = view.tx !== 0 || view.ty !== 0 || view.scale !== 1;

  // ---- gestures ----
  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setAnimating(false);
      setView((v) => ({ ...v, scale: clamp((pinch.current!.scale * d) / pinch.current!.dist, 0.55, 2.6) }));
      moved.current = true;
      return;
    }
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
    setAnimating(false);
    setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    setAnimating(false);
    setView((v) => ({ ...v, scale: clamp(v.scale * (1 - e.deltaY * 0.0015), 0.55, 2.6) }));
  };

  // ---- focus / select ----
  const focusNode = (p: Placed) => {
    const s = 1.5;
    setAnimating(true);
    setView({ tx: -p.x * s, ty: -p.y * s, scale: s });
    setSelectedId(p.node.id);
    setSent(false);
  };
  const overview = () => {
    setAnimating(true);
    setView({ tx: 0, ty: 0, scale: 1 });
    setSelectedId(null);
  };

  // ---- mutate ----
  const patch = (id: string, p: Partial<GoalNode>) =>
    setGoals((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...p } : n)) } : g))
    );
  const setStatus = (id: string, status: NodeStatus) => {
    const p: Partial<GoalNode> = { status };
    if (status === "done") p.progress = 100;
    patch(id, p);
  };

  const submit = async () => {
    const text = prompt.trim();
    if (!text || thinking) return;
    setPrompt("");
    setThinking(true);
    await new Promise((r) => setTimeout(r, 780));
    const node: GoalNode = {
      id: makeId("node"),
      goalId: goal.id,
      parentId: null,
      title: text.replace(/\s+/g, " ").replace(/[.?!]+$/, ""),
      description: "",
      status: "not_started",
      progress: 0,
      priority: 3,
      estimatedMinutes: 30,
      dueDate: null,
      positionX: null,
      positionY: null,
      aiReason: "Added from the map",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setGoals((prev) => prev.map((g, i) => (i === gi ? { ...g, nodes: [...g.nodes, node] } : g)));
    setNewIds((s) => new Set(s).add(node.id));
    setThinking(false);
    // focus the freshly grown node next tick (after layout recompute)
    setTimeout(() => {
      const np = layout([...goal.nodes, node]).at(-1);
      if (np) focusNode(np);
    }, 30);
  };

  const transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* viewport */}
      <div
        ref={viewportRef}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        style={{ touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        onClick={() => { if (!moved.current) overview(); }}
      >
        {/* faint depth grid drifts with the world */}
        <div
          className="absolute inset-0 grid-veil opacity-[0.5]"
          style={{ transform: `translate(${view.tx / 8}px, ${view.ty / 8}px)` }}
        />

        {/* world */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{ transform, transformOrigin: "center", transition: animating ? "transform 0.55s cubic-bezier(0.22,1,0.36,1)" : "none", willChange: "transform" }}
        >
          {/* connectors */}
          <svg width={1} height={1} className="absolute" style={{ left: 0, top: 0, overflow: "visible" }} aria-hidden>
            {placed.map((p) => {
              const isNext = p.node.id === nId;
              const cx = p.x * 0.5 + 22 * Math.cos(p.node.title.length);
              const cy = p.y * 0.5 - 22 * Math.sin(p.node.title.length);
              return (
                <path
                  key={p.node.id}
                  d={`M 0 0 Q ${cx} ${cy} ${p.x} ${p.y}`}
                  fill="none"
                  stroke={isNext ? "#e6b877" : "rgba(255,255,255,0.13)"}
                  strokeWidth={isNext ? 1.6 : 1.1}
                  strokeLinecap="round"
                  strokeDasharray={isNext ? "3 7" : undefined}
                  className={isNext ? "animate-flow" : undefined}
                  opacity={p.node.status === "not_started" ? 0.6 : 1}
                />
              );
            })}
          </svg>

          {/* core */}
          <CoreNode goal={goal} onOpen={() => goals.length > 1 && setMenu(true)} />

          {/* nodes */}
          {placed.map((p) => (
            <MapNode
              key={p.node.id}
              placed={p}
              isNext={p.node.id === nId}
              selected={p.node.id === selectedId}
              fresh={newIds.has(p.node.id)}
              onSelect={() => { if (!moved.current) focusNode(p); }}
            />
          ))}
        </div>

        {/* thinking wisp */}
        {thinking && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="block h-24 w-24 animate-ping rounded-full border border-accent/40" />
          </div>
        )}
      </div>

      {/* top: project switcher */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3 md:p-5">
        <button
          onClick={() => goals.length > 1 && setMenu((m) => !m)}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/70 px-4 py-1.5 text-sm font-medium text-ink backdrop-blur-md"
        >
          {goal.title}
          {goals.length > 1 && <ChevronDown size={14} className="text-faint" />}
        </button>
        {menu && (
          <div className="pointer-events-auto absolute top-14 z-20 w-64 animate-fade-in rounded-2xl border border-line bg-canvas-2/90 p-1.5 backdrop-blur-xl md:top-16">
            {goals.map((g, i) => (
              <button
                key={g.id}
                onClick={() => { setGi(i); setMenu(false); overview(); }}
                className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm", i === gi ? "bg-white/[0.06] text-ink" : "text-muted hover:bg-white/[0.03] hover:text-ink")}
              >
                <span className="truncate">{g.title}</span>
                <span className="ml-2 shrink-0 font-mono text-[11px] text-faint">{Math.round(g.progress)}%</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* recenter */}
      {dirty && (
        <button
          onClick={overview}
          className="absolute right-4 top-16 z-10 grid h-10 w-10 place-items-center rounded-full border border-line bg-canvas/70 text-muted backdrop-blur-md transition-colors hover:text-ink md:top-20"
          aria-label="Recenter"
        >
          <Locate size={16} />
        </button>
      )}

      {/* bottom: detail sheet OR prompt bar */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-6">
        <div className="mx-auto max-w-md">
          {selected ? (
            <NodeSheet
              node={selected}
              sent={sent}
              onClose={overview}
              onDone={() => setStatus(selected.id, "done")}
              onMotion={() => setStatus(selected.id, "in_motion")}
              onSend={() => setSent(true)}
            />
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); void submit(); }}
              className="flex items-center gap-2 rounded-2xl border border-line bg-canvas-2/85 p-1.5 pl-4 backdrop-blur-xl"
            >
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={thinking ? "Kairo is mapping…" : "Add a task or ask Kairo…"}
                disabled={thinking}
                className="h-9 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
              />
              <button
                type="submit"
                disabled={!prompt.trim() || thinking}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-[#1b1206] transition-opacity disabled:opacity-30"
                aria-label="Send"
              >
                <ArrowUp size={17} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function CoreNode({ goal, onOpen }: { goal: GoalWithNodes; onOpen: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: 0, top: 0 }}
      aria-label={goal.title}
    >
      <span className="absolute inset-0 -z-10 animate-pulse-soft rounded-full" style={{ background: "radial-gradient(circle, rgba(230,184,119,0.35), transparent 68%)", width: 140, height: 140, left: -70, top: -70 }} />
      <span
        className="grid h-[92px] w-[92px] place-items-center rounded-full"
        style={{
          background: "radial-gradient(circle at 34% 26%, #fdf3e0 0%, #e6b877 46%, #22190c 100%)",
          boxShadow: "inset 0 -8px 22px rgba(0,0,0,0.5), inset 0 3px 9px rgba(255,255,255,0.4), 0 0 44px rgba(230,184,119,0.28)",
        }}
      >
        <span className="text-center leading-none text-[#1b1206]">
          <span className="block text-lg font-bold">{Math.round(goal.progress)}%</span>
          <span className="mt-0.5 block text-[8.5px] font-semibold tracking-[0.12em]">IN MOTION</span>
        </span>
      </span>
    </button>
  );
}

function MapNode({
  placed,
  isNext,
  selected,
  fresh,
  onSelect,
}: {
  placed: Placed;
  isNext: boolean;
  selected: boolean;
  fresh: boolean;
  onSelect: () => void;
}) {
  const meta = nodeStatusMeta[placed.node.status];
  const done = placed.node.status === "done";
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: placed.x, top: placed.y }}>
      <div className={fresh ? "animate-grow-in" : ""}>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="group flex flex-col items-center gap-2"
          style={{ animation: "breathe 6s ease-in-out infinite", animationDelay: `${placed.delay}s` }}
        >
          <span className="relative grid place-items-center">
            {(isNext || selected) && (
              <span className="absolute inset-0 animate-pulse-soft rounded-full" style={{ boxShadow: `0 0 0 6px ${meta.hex}22, 0 0 26px ${meta.hex}55`, margin: -3 }} />
            )}
            <span
              className="grid h-[52px] w-[52px] place-items-center rounded-full border transition-colors"
              style={{
                borderColor: meta.hex,
                background: done ? meta.hex : "rgba(16,18,22,0.92)",
                boxShadow: done ? `0 0 18px ${meta.hex}66` : "none",
                opacity: placed.node.status === "not_started" ? 0.9 : 1,
              }}
            >
              {done ? (
                <Check size={20} className="text-[#0a0b0d]" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.hex }} />
              )}
            </span>
          </span>
          <span className="max-w-[128px] text-center leading-tight">
            <span className={cn("block truncate text-[12.5px]", selected ? "font-semibold text-ink" : "text-ink/85")}>{placed.node.title}</span>
            <span className="font-mono text-[10px]" style={{ color: meta.hex }}>{placed.node.estimatedMinutes}m</span>
          </span>
        </button>
      </div>
    </div>
  );
}

function NodeSheet({
  node,
  sent,
  onClose,
  onDone,
  onMotion,
  onSend,
}: {
  node: GoalNode;
  sent: boolean;
  onClose: () => void;
  onDone: () => void;
  onMotion: () => void;
  onSend: () => void;
}) {
  const meta = nodeStatusMeta[node.status];
  return (
    <div className="animate-sheet-up rounded-2xl border border-line bg-canvas-2/90 p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.hex }} />
            <span className="text-[12px]" style={{ color: meta.hex }}>{meta.label}</span>
            <span className="font-mono text-[11px] text-faint">· {formatDuration(node.estimatedMinutes)}</span>
          </div>
          <h2 className="mt-1 truncate font-display text-lg font-semibold text-ink">{node.title}</h2>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <p className="mt-2 text-[13px] text-muted">Next: spend 25 min to {node.title.toLowerCase()}.</p>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={onDone} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-sage/40 hover:text-sage">
          <Check size={14} /> Done
        </button>
        <button onClick={onMotion} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-accent/40 hover:text-accent">
          <Play size={14} /> Start
        </button>
        {sent ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-sage">
            <CalendarPlus size={14} /> In Today · <Link href="/app/today" className="underline">open</Link>
          </span>
        ) : (
          <button onClick={onSend} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-accent/40 hover:text-accent">
            <CalendarPlus size={14} /> Today
          </button>
        )}
      </div>
    </div>
  );
}
