"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUp, Check, Play, X, ChevronDown, Locate, GitBranch, Plus, Palette, Trash2, Sparkles, CalendarPlus, MessageCircle, Loader2, PlayCircle, Dumbbell, BookOpen, ExternalLink } from "lucide-react";
import type { GoalWithNodes, GoalNode, NodeStatus, NodeResource, ResourceKind } from "@/types";
import { parseDeadline } from "@/lib/kairo/deadline";
import { generateGoalMap } from "@/lib/ai/generate-goal-map";
import { expandNode, askNode } from "@/lib/ai/node-assist";
import type { Clarifier } from "@/lib/ai/types";
import { GOAL_PALETTE, goalColorHex, goalColorIndex } from "@/lib/kairo/goal-color";
import { usePersistentState } from "@/lib/store/persist";
import { useSpeechInput } from "@/lib/hooks/use-speech-input";
import {
  persistGoalFromMap,
  addNode,
  setNodeStatus,
  setGoalDeadline,
  deleteGoal,
} from "@/lib/data/actions";
import { MicButton } from "@/components/ui/MicButton";
import { Chip } from "@/components/ui/Chip";
import { cn, formatDuration, newId, relativeDays, truncate } from "@/lib/utils";

const GOLDEN = 2.399963229;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const nowISO = () => new Date().toISOString();

// A resource is a search intent, not a URL — one tap opens a live search so the
// link is never dead. "read" → Google, "watch"/"practice" → YouTube.
const RESOURCE_META: Record<ResourceKind, { verb: string; Icon: typeof PlayCircle }> = {
  watch: { verb: "Watch", Icon: PlayCircle },
  practice: { verb: "Practice", Icon: Dumbbell },
  read: { verb: "Read", Icon: BookOpen },
};
function resourceUrl(r: NodeResource): string {
  const q = encodeURIComponent(r.query);
  return r.kind === "read"
    ? `https://www.google.com/search?q=${q}`
    : `https://www.youtube.com/results?search_query=${q}`;
}

/** Deterministic galaxy slot for a goal by its index (used until dragged). */
function defaultPos(i: number): { x: number; y: number } {
  const r = 250 + 130 * Math.sqrt(i);
  const a = i * GOLDEN - Math.PI / 2;
  return { x: Math.cos(a) * (i === 0 ? 0 : r), y: Math.sin(a) * (i === 0 ? 0 : r) };
}

function nextId(nodes: GoalNode[]): string | null {
  return (
    nodes.find((n) => n.status === "in_motion")?.id ??
    nodes.find((n) => n.status === "at_risk")?.id ??
    nodes.find((n) => n.status === "not_started")?.id ??
    null
  );
}

interface Placed {
  node: GoalNode;
  x: number;
  y: number;
  px: number; // parent center (0,0 = goal core)
  py: number;
  depth: number;
  spine: boolean; // a milestone (has children) vs a leaf sub-step
}

const SPINE_RAD = 172; // distance to the next milestone along the spine
const LEAF_RAD = 132; // distance to a leaf sub-step

/**
 * Tree layout relative to the goal core at (0,0). Milestones (nodes with
 * children) flow FORWARD along the spine — kept centered in each fan — while
 * leaf sub-steps splay out to the sides, so a plan reads as a path with
 * branches rather than a straight line or a crowded burst.
 */
function layoutTree(nodes: GoalNode[]): Placed[] {
  const ids = new Set(nodes.map((n) => n.id));
  const kids = new Map<string | null, GoalNode[]>();
  for (const n of nodes) {
    const parent = n.parentId && ids.has(n.parentId) ? n.parentId : null;
    const arr = kids.get(parent) ?? [];
    arr.push(n);
    kids.set(parent, arr);
  }
  const hasKids = (id: string) => (kids.get(id)?.length ?? 0) > 0;
  const out: Placed[] = [];

  const place = (parentId: string | null, cx: number, cy: number, dir: number, depth: number) => {
    const children = kids.get(parentId) ?? [];
    const leaves = children.filter((c) => !hasKids(c.id));
    const spineKids = children.filter((c) => hasKids(c.id));
    // Center the continuing milestone(s) in the fan, leaves flanking them.
    const half = Math.ceil(leaves.length / 2);
    const ordered = [...leaves.slice(0, half), ...spineKids, ...leaves.slice(half)];
    const n = ordered.length;
    const spread = Math.min(Math.PI * 0.92, 0.5 + n * 0.34);

    ordered.forEach((node, i) => {
      const spine = hasKids(node.id);
      const offset = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread;
      const angle = dir + offset;
      const rad = spine ? SPINE_RAD : LEAF_RAD;
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      out.push({ node, x, y, px: cx, py: cy, depth, spine });
      if (spine) place(node.id, x, y, angle, depth + 1);
    });
  };

  // Root milestones off the core. Usually one (the first milestone); if the plan
  // has several independent starts, fan them around the core.
  const roots = kids.get(null) ?? [];
  const r = roots.length;
  roots.forEach((root, i) => {
    const dir = r === 1 ? -Math.PI / 2 : (i / r) * Math.PI * 2 - Math.PI / 2;
    const spine = hasKids(root.id);
    const rad = spine ? SPINE_RAD : LEAF_RAD;
    const x = Math.cos(dir) * rad;
    const y = Math.sin(dir) * rad;
    out.push({ node: root, x, y, px: 0, py: 0, depth: 0, spine });
    if (spine) place(root.id, x, y, dir, 1);
  });
  return out;
}

function toLocalGoal(goalId: string, res: Awaited<ReturnType<typeof generateGoalMap>>, nodeIds?: string[]): GoalWithNodes {
  const ids = nodeIds ?? res.nodes.map(() => newId());
  const nodes: GoalNode[] = res.nodes.map((n, i) => ({
    id: ids[i],
    goalId,
    parentId: n.parentIndex != null && n.parentIndex >= 0 && n.parentIndex < i ? ids[n.parentIndex] : null,
    title: n.title,
    description: n.description ?? "",
    status: i === 0 ? "in_motion" : "not_started",
    progress: 0,
    priority: n.priority ?? i + 1,
    estimatedMinutes: n.estimatedMinutes ?? 60,
    dueDate: null,
    positionX: null,
    positionY: null,
    aiReason: n.aiReason ?? null,
    resource: n.resource ?? null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }));
  return {
    id: goalId,
    userId: "",
    title: res.title,
    description: res.description ?? "",
    status: "active",
    progress: 0,
    targetDate: res.suggestedTargetDate ?? null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    archivedAt: null,
    nodes,
  };
}

export function GalaxyMap({
  goals: initialGoals,
  initialGoalId,
  remote = false,
}: {
  goals: GoalWithNodes[];
  initialGoalId?: string;
  remote?: boolean;
}) {
  const [goals, setGoals] = usePersistentState<GoalWithNodes[]>("kairo.goals.v1", initialGoals, !remote);
  const [positions, setPositions] = usePersistentState<Record<string, { x: number; y: number }>>("kairo.galaxy.v1", {});
  const [colorIdx, setColorIdx] = usePersistentState<Record<string, number>>("kairo.colors.v1", {});

  const initialExpanded = initialGoalId ?? (initialGoals.length === 1 ? initialGoals[0].id : null);
  const [view, setView] = React.useState(() => {
    if (!initialExpanded) return { tx: 0, ty: 0, scale: 0.9 };
    const i = Math.max(0, initialGoals.findIndex((g) => g.id === initialExpanded));
    const p = defaultPos(i);
    const scale = 0.82;
    return { tx: -p.x * scale, ty: -p.y * scale, scale };
  });
  const [animating, setAnimating] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(initialExpanded);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [poppedId, setPoppedId] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState(false);

  const [composing, setComposing] = React.useState(false); // new-goal input open
  const [prompt, setPrompt] = React.useState("");
  const [mapping, setMapping] = React.useState(false);
  const [branchFor, setBranchFor] = React.useState<string | null>(null); // node id to branch from
  const [branchText, setBranchText] = React.useState("");
  const [stepText, setStepText] = React.useState("");
  const [assisting, setAssisting] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [refine, setRefine] = React.useState<{ goalId: string; prompt: string; clarifiers: Clarifier[] } | null>(null);

  const speech = useSpeechInput(setPrompt);
  const pointers = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = React.useRef<{ dist: number; scale: number } | null>(null);
  const moved = React.useRef(false);
  const goalDrag = React.useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  const posOf = React.useCallback(
    (id: string, i: number) => positions[id] ?? defaultPos(i),
    [positions]
  );
  const hexOf = React.useCallback(
    (id: string) => goalColorHex(id, colorIdx[id]),
    [colorIdx]
  );

  const expanded = goals.find((g) => g.id === expandedId) ?? null;
  const selectedNode = expanded?.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const dirty = view.tx !== 0 || view.ty !== 0 || Math.abs(view.scale - 0.9) > 0.01;

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((c) => (c === m ? null : c)), 2600);
  };

  // ---- view helpers ----
  const flyTo = React.useCallback((id: string) => {
    const i = goals.findIndex((g) => g.id === id);
    if (i < 0) return;
    const p = positions[id] ?? defaultPos(i);
    const scale = 0.82;
    setAnimating(true);
    setView({ tx: -p.x * scale, ty: -p.y * scale, scale });
  }, [goals, positions]);

  const overview = () => {
    setAnimating(true);
    setView({ tx: 0, ty: 0, scale: 0.9 });
    setSelectedNodeId(null);
  };

  // ---- canvas gestures (pan/zoom) ----
  const onDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (goalDrag.current) return;
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setAnimating(false);
      setView((v) => ({ ...v, scale: clamp((pinch.current!.scale * d) / pinch.current!.dist, 0.35, 2.4) }));
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
    setView((v) => ({ ...v, scale: clamp(v.scale * (1 - e.deltaY * 0.0015), 0.35, 2.4) }));
  };
  const onCanvasClick = () => {
    if (moved.current) return;
    if (selectedNode) setSelectedNodeId(null);
    else if (expandedId) { setExpandedId(null); overview(); }
  };

  // ---- planet drag / tap ----
  const onPlanetDown = (e: React.PointerEvent, id: string, i: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = posOf(id, i);
    goalDrag.current = { id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false };
  };
  const onPlanetMove = (e: React.PointerEvent) => {
    const d = goalDrag.current;
    if (!d) return;
    e.stopPropagation();
    const dx = (e.clientX - d.sx) / view.scale;
    const dy = (e.clientY - d.sy) / view.scale;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
    setAnimating(false);
    setPositions((p) => ({ ...p, [d.id]: { x: d.ox + dx, y: d.oy + dy } }));
  };
  const onPlanetUp = (e: React.PointerEvent, id: string) => {
    const d = goalDrag.current;
    goalDrag.current = null;
    if (d && !d.moved) {
      e.stopPropagation();
      if (expandedId === id) { setExpandedId(null); overview(); }
      else { setExpandedId(id); setSelectedNodeId(null); flyTo(id); }
    }
  };

  // ---- mutations ----
  const setStatus = (goalId: string, id: string, status: NodeStatus) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const nodes = g.nodes.map((n) => (n.id === id ? { ...n, status, ...(status === "done" ? { progress: 100 } : {}) } : n));
        const done = nodes.filter((n) => n.status === "done").length;
        const progress = nodes.length ? Math.round((done / nodes.length) * 100) : g.progress;
        return { ...g, nodes, progress };
      })
    );
    if (status === "done") {
      setPoppedId(id);
      window.setTimeout(() => setPoppedId((c) => (c === id ? null : c)), 650);
    }
    if (remote) void setNodeStatus({ goalId, nodeId: id, status });
  };

  const addBranch = (goalId: string, parentId: string | null, title: string) => {
    const text = title.trim();
    if (!text) return;
    const g = goals.find((x) => x.id === goalId);
    if (!g) return;
    const id = newId();
    const node: GoalNode = {
      id, goalId, parentId, title: text.replace(/\s+/g, " ").replace(/[.?!]+$/, ""),
      description: "", status: "not_started", progress: 0, priority: 3, estimatedMinutes: 30,
      dueDate: null, positionX: null, positionY: null, aiReason: "Added from the map", resource: null,
      createdAt: nowISO(), updatedAt: nowISO(),
    };
    setGoals((prev) => prev.map((x) => (x.id === goalId ? { ...x, nodes: [...x.nodes, node] } : x)));
    if (remote) void addNode({ id, goalId, title: node.title, estimatedMinutes: 30, sortOrder: g.nodes.length, parentId });
  };

  const setDeadline = (goalId: string, text: string) => {
    const parsed = parseDeadline(text);
    if (!parsed) { showToast("Couldn't read that date — try \"by March\" or \"in 6 weeks\""); return false; }
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, targetDate: parsed.iso } : g)));
    if (remote) void setGoalDeadline({ goalId, iso: parsed.iso });
    showToast(`Deadline set · ${parsed.label}`);
    return true;
  };

  const cycleColor = (id: string) => {
    setColorIdx((c) => ({ ...c, [id]: ((c[id] ?? goalColorIndex(id)) + 1) % GOAL_PALETTE.length }));
  };

  const removeGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setExpandedId(null);
    setSelectedNodeId(null);
    overview();
    if (remote) void deleteGoal({ goalId: id });
    showToast("Goal removed");
  };

  const createGoal = async (text: string, isRefinement = false) => {
    const p = text.trim();
    if (!p || mapping) return;
    setMapping(true);
    setComposing(false);
    setRefine(null);
    setPrompt("");
    const res = await generateGoalMap({ prompt: p });
    let goalId = newId();
    let nodeIds: string[] | undefined;
    if (remote) {
      const saved = await persistGoalFromMap({ result: res });
      if (saved.ok && saved.id) { goalId = saved.id; nodeIds = saved.nodeIds; }
    }
    const goal = toLocalGoal(goalId, res, nodeIds);
    const pos = defaultPos(goals.length);
    setPositions((pp) => ({ ...pp, [goalId]: pos }));
    setGoals((prev) => [...prev, goal]);
    setMapping(false);
    setExpandedId(goalId);
    setSelectedNodeId(null);
    // Fly straight to the known position — don't rely on flyTo's findIndex over
    // the goals array, which hasn't updated yet inside this closure.
    const scale = 0.82;
    setAnimating(true);
    setView({ tx: -pos.x * scale, ty: -pos.y * scale, scale });
    // Only offer clarifiers on the FIRST plan for a goal — a refined plan must
    // not spawn a new round of questions (that's an endless, token-burning loop).
    if (!isRefinement && res.clarifiers && res.clarifiers.length > 0) {
      setRefine({ goalId, prompt: p, clarifiers: res.clarifiers });
    }
  };

  // Apply the staged clarifier answers (+ optional free text) in ONE regen.
  const applyRefinements = (answers: Record<string, string>, extra: string) => {
    const r = refine;
    if (!r) return;
    const parts = Object.entries(answers).map(([q, a]) => `${q.replace(/\?$/, "")}: ${a}`);
    if (extra.trim()) parts.push(extra.trim());
    setRefine(null);
    if (parts.length === 0) return;
    setGoals((prev) => prev.filter((g) => g.id !== r.goalId));
    if (remote) void deleteGoal({ goalId: r.goalId });
    void createGoal(`${r.prompt} — ${parts.join("; ")}`, true);
  };

  // Add several AI-generated sub-steps as branches under a node.
  const addSteps = (goalId: string, parentId: string, steps: { title: string; estimatedMinutes: number }[]) => {
    const g = goals.find((x) => x.id === goalId);
    if (!g) return;
    let order = g.nodes.length;
    const created: GoalNode[] = steps.map((s) => {
      const id = newId();
      if (remote) void addNode({ id, goalId, title: s.title, estimatedMinutes: s.estimatedMinutes, sortOrder: order++, parentId });
      return {
        id, goalId, parentId, title: s.title, description: "", status: "not_started", progress: 0,
        priority: 3, estimatedMinutes: s.estimatedMinutes, dueDate: null, positionX: null, positionY: null,
        aiReason: "Aether broke this down", resource: null, createdAt: nowISO(), updatedAt: nowISO(),
      };
    });
    setGoals((prev) => prev.map((x) => (x.id === goalId ? { ...x, nodes: [...x.nodes, ...created] } : x)));
  };

  const breakDown = async (node: GoalNode) => {
    if (!expanded || assisting) return;
    setAssisting(true);
    const res = await expandNode({ goalTitle: expanded.title, nodeTitle: node.title, nodeDescription: node.description });
    if (res.steps.length) addSteps(expanded.id, node.id, res.steps);
    setAssisting(false);
    showToast(`Added ${res.steps.length} step${res.steps.length === 1 ? "" : "s"} under "${truncate(node.title, 20)}"`);
  };

  const transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;
  const empty = goals.length === 0;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* viewport */}
      <div
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        style={{ touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={(e) => { onPlanetMove(e); onMove(e); }}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        onClick={onCanvasClick}
      >
        <div className="absolute inset-0 grid-veil opacity-50" style={{ transform: `translate(${view.tx / 8}px, ${view.ty / 8}px)` }} />

        {/* the galaxy */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{ transform, transformOrigin: "center", transition: animating ? "transform 0.6s cubic-bezier(0.22,1,0.36,1)" : "none", willChange: "transform" }}
        >
          {goals.map((g, i) => (
            <GoalCluster
              key={g.id}
              goal={g}
              pos={posOf(g.id, i)}
              hex={hexOf(g.id)}
              expanded={expandedId === g.id}
              dimmed={expandedId != null && expandedId !== g.id}
              hovered={hoverId === g.id}
              selectedNodeId={selectedNodeId}
              poppedId={poppedId}
              onPlanetDown={(e) => onPlanetDown(e, g.id, i)}
              onPlanetUp={(e) => onPlanetUp(e, g.id)}
              onEnter={() => setHoverId(g.id)}
              onLeave={() => setHoverId((h) => (h === g.id ? null : h))}
              onSelectNode={(nid) => { if (!moved.current) setSelectedNodeId(nid); }}
            />
          ))}
        </div>

        {mapping && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative grid place-items-center">
              <span className="h-24 w-24 animate-ping rounded-full border border-accent/40" />
              <span className="absolute h-10 w-10 rounded-full" style={{ background: "radial-gradient(circle at 36% 28%, #fdf3e0 0%, #e6b877 46%, #1a130a 100%)", boxShadow: "0 0 30px rgba(230,184,119,0.5)" }} />
              <div className="absolute top-[calc(100%+18px)] whitespace-nowrap text-center">
                <p className="font-display text-lg text-ink">Mapping your goal…</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-accent/70">Aether is drawing the path</p>
              </div>
            </div>
          </div>
        )}

        {empty && !mapping && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center pb-40">
            <div className="grid place-items-center text-center">
              <span className="rounded-full" style={{ width: 96, height: 96, background: "radial-gradient(circle at 36% 28%, #fdf3e0 0%, #e6b877 46%, #1a130a 100%)", boxShadow: "0 0 60px rgba(230,184,119,0.28)", animation: "breathe 6s ease-in-out infinite" }} />
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">Your map is empty</p>
            </div>
          </div>
        )}
      </div>

      {/* top chrome: goal switcher (fly-to) + new goal */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] md:px-5 md:pt-5">
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            disabled={empty}
            className="chrome pointer-events-auto inline-flex max-w-[64vw] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
          >
            <span className="truncate">{expanded ? truncate(expanded.title, 30) : empty ? "No goals yet" : "All goals"}</span>
            {!empty && <ChevronDown size={14} className="shrink-0 text-faint" />}
          </button>
          {menu && !empty && (
            <div className="chrome pointer-events-auto absolute top-12 z-20 w-64 animate-fade-in rounded-2xl p-1.5">
              <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Jump to</p>
              {goals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => { setExpandedId(g.id); setSelectedNodeId(null); setMenu(false); flyTo(g.id); }}
                  className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm", expandedId === g.id ? "raised-btn text-ink" : "text-muted hover:text-ink")}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: hexOf(g.id), boxShadow: `0 0 8px ${hexOf(g.id)}` }} />
                  <span className="min-w-0 flex-1 truncate">{g.title}</span>
                  <span className="shrink-0 font-mono text-[11px] text-faint">{Math.round(g.progress)}%</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => { setComposing(true); setExpandedId(null); setSelectedNodeId(null); }}
          className="raised-gold pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium"
        >
          <Plus size={15} /> New goal
        </button>
      </div>

      {/* recenter */}
      {dirty && !empty && (
        <button
          onClick={overview}
          className="chrome absolute right-4 top-[calc(env(safe-area-inset-top)+56px)] z-10 grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:text-ink md:top-20"
          aria-label="Recenter"
        >
          <Locate size={16} />
        </button>
      )}

      {/* bottom: contextual bar */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-6">
        <div className="mx-auto max-w-md">
          {toast && (
            <div className="chrome mb-2 animate-fade-in rounded-xl px-4 py-2 text-center text-[13px] text-accent">
              {toast}
            </div>
          )}

          {refine && expandedId === refine.goalId && !mapping && !composing && !selectedNode && !branchFor && (
            <ClarifierBar clarifiers={refine.clarifiers} onApply={applyRefinements} onClose={() => setRefine(null)} />
          )}

          {/* new-goal composer (also the empty-state entry) */}
          {(composing || empty) && !mapping ? (
            <NewGoalBar
              value={prompt}
              onChange={setPrompt}
              onSubmit={() => void createGoal(prompt)}
              speech={speech}
              empty={empty}
              onCancel={empty ? undefined : () => { setComposing(false); setPrompt(""); }}
            />
          ) : branchFor && expanded ? (
            <MiniInput
              placeholder="Add a branch here…"
              value={branchText}
              onChange={setBranchText}
              onSubmit={() => { addBranch(expanded.id, branchFor, branchText); setBranchText(""); setBranchFor(null); }}
              onClose={() => { setBranchFor(null); setBranchText(""); }}
              icon={<GitBranch size={15} />}
            />
          ) : selectedNode && expanded ? (
            <NodeSheet
              node={selectedNode}
              hex={hexOf(expanded.id)}
              goalTitle={expanded.title}
              breaking={assisting}
              onClose={() => setSelectedNodeId(null)}
              onDone={() => { setStatus(expanded.id, selectedNode.id, "done"); setSelectedNodeId(null); }}
              onStart={() => setStatus(expanded.id, selectedNode.id, "in_motion")}
              onBranch={() => setBranchFor(selectedNode.id)}
              onBreakDown={() => breakDown(selectedNode)}
            />
          ) : expanded ? (
            <GoalBar
              goal={expanded}
              hex={hexOf(expanded.id)}
              value={stepText}
              onChange={setStepText}
              onAddStep={() => {
                const t = stepText.trim();
                if (!t) return;
                const dl = /\b(deadline|due|by|before|finish by|done by)\b/i.test(t);
                if (dl && setDeadline(expanded.id, t)) { setStepText(""); return; }
                addBranch(expanded.id, null, t);
                setStepText("");
              }}
              onColor={() => cycleColor(expanded.id)}
              onDelete={() => removeGoal(expanded.id)}
              onClose={() => { setExpandedId(null); overview(); }}
            />
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="chrome flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] text-muted transition-colors hover:text-ink"
            >
              <Plus size={16} className="text-accent" /> New goal
              <span className="mx-1 text-faint">·</span>
              <span className="text-faint">tap a planet to open it</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function GoalCluster({
  goal, pos, hex, expanded, dimmed, hovered, selectedNodeId, poppedId,
  onPlanetDown, onPlanetUp, onEnter, onLeave, onSelectNode,
}: {
  goal: GoalWithNodes;
  pos: { x: number; y: number };
  hex: string;
  expanded: boolean;
  dimmed: boolean;
  hovered: boolean;
  selectedNodeId: string | null;
  poppedId: string | null;
  onPlanetDown: (e: React.PointerEvent) => void;
  onPlanetUp: (e: React.PointerEvent) => void;
  onEnter: () => void;
  onLeave: () => void;
  onSelectNode: (id: string) => void;
}) {
  const placed = React.useMemo(() => (expanded ? layoutTree(goal.nodes) : []), [expanded, goal.nodes]);
  const nId = nextId(goal.nodes);

  return (
    <div className="absolute" style={{ left: pos.x, top: pos.y, opacity: dimmed ? 0.32 : 1, transition: "opacity 0.4s ease" }}>
      {/* branches */}
      {expanded && (
        <svg width={1} height={1} className="absolute" style={{ left: 0, top: 0, overflow: "visible" }} aria-hidden>
          {placed.map((p) => {
            const isNext = p.node.id === nId;
            const CORE_R = p.px === 0 && p.py === 0 ? 46 : 24;
            const NODE_R = p.spine ? 25 : 20;
            const dx = p.x - p.px;
            const dy = p.y - p.py;
            const d = Math.hypot(dx, dy) || 1;
            const sx = p.px + (dx / d) * CORE_R;
            const sy = p.py + (dy / d) * CORE_R;
            const ex = p.x - (dx / d) * NODE_R;
            const ey = p.y - (dy / d) * NODE_R;
            const mx = (sx + ex) / 2 + dy * 0.08;
            const my = (sy + ey) / 2 - dx * 0.08;
            return (
              <path
                key={p.node.id}
                d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`}
                fill="none"
                stroke={hex}
                strokeWidth={isNext ? 1.7 : 1.1}
                strokeLinecap="round"
                strokeDasharray={isNext ? "3 7" : undefined}
                className={isNext ? "animate-flow" : undefined}
                opacity={p.node.status === "done" ? 0.85 : p.node.status === "not_started" ? 0.4 : 0.7}
              />
            );
          })}
        </svg>
      )}

      {/* nodes */}
      {expanded &&
        placed.map((p) => (
          <NodeOrb
            key={p.node.id}
            node={p.node}
            x={p.x}
            y={p.y}
            hex={hex}
            isNext={p.node.id === nId}
            selected={p.node.id === selectedNodeId}
            popping={p.node.id === poppedId}
            spine={p.spine}
            onSelect={() => onSelectNode(p.node.id)}
          />
        ))}

      {/* core planet */}
      <button
        onPointerDown={onPlanetDown}
        onPointerUp={onPlanetUp}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={(e) => e.stopPropagation()}
        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-none"
        style={{ left: 0, top: 0 }}
        aria-label={goal.title}
      >
        <span className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 animate-pulse-soft rounded-full"
          style={{ background: `radial-gradient(circle, ${hex}55, transparent 68%)`, width: 150, height: 150 }} />
        <span
          className={cn("grid place-items-center rounded-full transition-transform", expanded ? "h-[92px] w-[92px]" : "h-20 w-20")}
          style={{
            background: `radial-gradient(circle at 34% 26%, #fdf3e0 0%, ${hex} 46%, #1a130a 100%)`,
            boxShadow: `inset 0 -8px 22px rgba(0,0,0,0.5), inset 0 3px 9px rgba(255,255,255,0.35), 0 0 44px ${hex}44`,
          }}
        >
          <span className="text-center leading-none text-[#1b1206]">
            <span className="block text-[17px] font-bold">{Math.round(goal.progress)}%</span>
          </span>
        </span>
        {/* label: always visible on touch; hover-reveal on desktop; always when open */}
        <span
          className={cn(
            "pointer-events-none absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap text-center transition-opacity duration-200",
            expanded || hovered ? "opacity-100" : "opacity-100 [@media(hover:hover)]:opacity-0"
          )}
        >
          <span className="block text-[13.5px] font-semibold text-ink" style={{ textShadow: "0 1px 14px rgba(8,9,11,0.96), 0 0 5px rgba(8,9,11,0.9)" }}>
            {truncate(goal.title, 34)}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] text-faint" style={{ textShadow: "0 1px 12px rgba(8,9,11,0.96)" }}>
            {goal.nodes.length} step{goal.nodes.length === 1 ? "" : "s"}
            {goal.targetDate ? ` · due ${relativeDays(goal.targetDate)}` : ""}
          </span>
        </span>
      </button>
    </div>
  );
}

function NodeOrb({
  node, x, y, hex, isNext, selected, popping, spine, onSelect,
}: {
  node: GoalNode;
  x: number;
  y: number;
  hex: string;
  isNext: boolean;
  selected: boolean;
  popping: boolean;
  spine: boolean;
  onSelect: () => void;
}) {
  const done = node.status === "done";
  const dim = node.status === "not_started";
  const size = spine ? 50 : 38;
  const glow = done
    ? `0 0 24px ${hex}88, inset 0 0 12px ${hex}55`
    : dim
      ? `0 0 10px ${hex}30`
      : isNext
        ? `0 0 26px ${hex}80`
        : `0 0 16px ${hex}4d`;
  const bg = done
    ? `radial-gradient(circle at 38% 30%, #f6faf5 0%, ${hex} 55%, #14231a 100%)`
    : `radial-gradient(circle at 40% 34%, ${hex}33, rgba(12,14,18,0.94) 72%)`;
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 animate-grow-in" style={{ left: x, top: y }}>
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-1.5 p-1.5"
        style={{ animation: "breathe 6s ease-in-out infinite" }}
      >
        <span className="relative grid place-items-center" style={{ width: size, height: size }}>
          {(isNext || selected) && (
            <span className="absolute inset-0 animate-pulse-soft rounded-full" style={{ boxShadow: `0 0 0 4px ${hex}22, 0 0 24px ${hex}66`, margin: -4 }} />
          )}
          {popping && <span className="absolute inset-0 animate-burst rounded-full" style={{ border: `2px solid ${hex}` }} />}
          <span
            className={cn("grid place-items-center rounded-full border", popping && "animate-pop")}
            style={{ width: size, height: size, borderColor: dim ? `${hex}88` : hex, background: bg, boxShadow: glow, opacity: dim ? 0.92 : 1, transition: "background .4s ease, box-shadow .4s ease" }}
          >
            {done ? (
              <Check size={spine ? 18 : 15} className="text-[#0d1a14]" strokeWidth={2.5} />
            ) : (
              <span className="rounded-full" style={{ width: spine ? 9 : 7, height: spine ? 9 : 7, background: hex, boxShadow: `0 0 8px ${hex}` }} />
            )}
          </span>
        </span>
        <span className="max-w-[120px] text-center leading-tight">
          <span className={cn("block truncate text-[12px]", selected ? "font-semibold text-ink" : "text-ink/80")}>{node.title}</span>
        </span>
      </button>
    </div>
  );
}

/* ------------------------------ bottom bars ------------------------------ */

type Speech = ReturnType<typeof useSpeechInput>;

function NewGoalBar({
  value, onChange, onSubmit, speech, empty, onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  speech: Speech;
  empty: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="animate-sheet-up">
      {empty && (
        <p className="mb-3 text-center text-[15px] text-muted">
          <span className="font-display text-ink">What are we making happen?</span>
          <br />
          Tell Aether a goal — it maps the whole path.
        </p>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="chrome flex items-center gap-2 rounded-2xl p-1.5 pl-4"
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={speech.listening ? "Listening…" : "Launch my app by September…"}
          className="h-10 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
        />
        {speech.supported && <MicButton listening={speech.listening} onClick={() => speech.toggle(value)} />}
        {onCancel && (
          <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-xl text-faint hover:text-ink" aria-label="Cancel">
            <X size={16} />
          </button>
        )}
        <button type="submit" disabled={!value.trim()} className="raised-gold grid h-9 shrink-0 place-items-center gap-1 rounded-xl px-3.5 disabled:opacity-30" aria-label="Map goal">
          <Sparkles size={16} />
        </button>
      </form>
    </div>
  );
}

function GoalBar({
  goal, hex, value, onChange, onAddStep, onColor, onDelete, onClose,
}: {
  goal: GoalWithNodes;
  hex: string;
  value: string;
  onChange: (v: string) => void;
  onAddStep: () => void;
  onColor: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(t);
  }, [armed]);

  return (
    <div className="chrome animate-sheet-up rounded-2xl p-2.5">
      {armed ? (
        <div className="flex items-center gap-2 px-1.5 py-1">
          <span className="min-w-0 flex-1 text-[13px] text-warn">Delete &ldquo;{truncate(goal.title, 20)}&rdquo; and all its steps?</span>
          <Chip onClick={() => setArmed(false)}>Cancel</Chip>
          <Chip tone="warn" icon={<Trash2 size={14} />} onClick={() => { setArmed(false); onDelete(); }}>Delete</Chip>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2 px-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: hex, boxShadow: `0 0 8px ${hex}` }} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{goal.title}</span>
            <button onClick={onColor} className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Change color"><Palette size={15} /></button>
            <button onClick={() => setArmed(true)} className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:text-warn" aria-label="Delete goal"><Trash2 size={15} /></button>
            <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Close"><X size={15} /></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onAddStep(); }} className="inset-well flex items-center gap-2 rounded-xl p-1 pl-3.5">
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Add a step, or set a deadline…"
              className="h-9 flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
            />
            <button type="submit" disabled={!value.trim()} className="raised-gold grid h-8 w-8 shrink-0 place-items-center rounded-lg disabled:opacity-30" aria-label="Add"><ArrowUp size={16} /></button>
          </form>
        </>
      )}
    </div>
  );
}

function MiniInput({
  placeholder, value, onChange, onSubmit, onClose, icon,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  icon: React.ReactNode;
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="chrome animate-sheet-up flex items-center gap-2 rounded-2xl p-1.5 pl-4">
      <span className="text-accent">{icon}</span>
      <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none" />
      <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-faint hover:text-ink" aria-label="Cancel"><X size={16} /></button>
      <button type="submit" disabled={!value.trim()} className="raised-gold grid h-9 w-9 shrink-0 place-items-center rounded-xl disabled:opacity-30" aria-label="Add"><ArrowUp size={17} /></button>
    </form>
  );
}

function ClarifierBar({ clarifiers, onApply, onClose }: { clarifiers: Clarifier[]; onApply: (answers: Record<string, string>, extra: string) => void; onClose: () => void }) {
  // Answers are staged locally — nothing regenerates until "Update plan", so a
  // whole round of questions costs at most ONE extra AI call.
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [showMore, setShowMore] = React.useState(false);
  const [extra, setExtra] = React.useState("");
  const pick = (q: string, o: string) => setAnswers((a) => ({ ...a, [q]: a[q] === o ? "" : o }));
  const dirty = Object.values(answers).some(Boolean) || extra.trim().length > 0;

  return (
    <div className="chrome mb-2 animate-sheet-up rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={13} className="text-accent" />
        <span className="flex-1 text-[12px] text-muted">Sharpen this plan <span className="text-faint">· optional</span></span>
        <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Dismiss"><X size={13} /></button>
      </div>

      <div className="space-y-2.5">
        {clarifiers.map((c, qi) => (
          <div key={qi}>
            <div className="mb-1.5 text-[12px] text-ink/80">{c.question}</div>
            <div className="flex flex-wrap gap-1.5">
              {c.options.map((o) => (
                <Chip key={o} tone="accent" active={answers[c.question] === o} onClick={() => pick(c.question, o)}>{o}</Chip>
              ))}
            </div>
          </div>
        ))}

        {/* Tell me more — free-text refinement (a future Pro capability). */}
        {showMore ? (
          <textarea
            autoFocus
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Anything else? Your level, constraints, what you already have…"
            className="inset-well min-h-[62px] w-full resize-none rounded-xl px-3.5 py-2.5 text-[13px] text-ink placeholder:text-faint focus-visible:outline-none"
          />
        ) : (
          <button onClick={() => setShowMore(true)} className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink">
            <Plus size={13} /> Tell me more
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button onClick={onClose} className="raised-btn rounded-lg px-3.5 py-1.5 text-[13px] text-muted hover:text-ink">Keep as is</button>
        <button onClick={() => onApply(answers, extra)} disabled={!dirty} className="raised-gold inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] disabled:opacity-40">
          <Sparkles size={13} /> Update plan
        </button>
      </div>
    </div>
  );
}

function NodeSheet({
  node, hex, goalTitle, breaking, onClose, onDone, onStart, onBranch, onBreakDown,
}: {
  node: GoalNode;
  hex: string;
  goalTitle: string;
  breaking: boolean;
  onClose: () => void;
  onDone: () => void;
  onStart: () => void;
  onBranch: () => void;
  onBreakDown: () => void;
}) {
  const [asking, setAsking] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const resMeta = node.resource ? RESOURCE_META[node.resource.kind] : null;

  const ask = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setAnswer(null);
    const res = await askNode({ goalTitle, nodeTitle: node.title, question: q });
    setAnswer(res.answer);
    setLoading(false);
  };

  return (
    <div className="chrome animate-sheet-up rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: hex, boxShadow: `0 0 6px ${hex}` }} />
            <span className="font-mono text-[11px] text-faint">{formatDuration(node.estimatedMinutes)}</span>
          </div>
          <h2 className="mt-1 font-display text-lg font-semibold leading-snug text-ink">{node.title}</h2>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Close"><X size={16} /></button>
      </div>
      {node.description && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{node.description}</p>}

      {node.resource && resMeta && (
        <a
          href={resourceUrl(node.resource)}
          target="_blank"
          rel="noopener noreferrer"
          className="raised-btn mt-3 flex items-center gap-3 rounded-xl px-3.5 py-2.5"
        >
          <resMeta.Icon size={18} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{resMeta.verb}: {node.resource.label}</span>
            <span className="block text-[11px] text-faint">Opens a search — pick the best result</span>
          </span>
          <ExternalLink size={14} className="shrink-0 text-faint" />
        </a>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip tone="sage" icon={<Check size={14} />} onClick={onDone}>Done</Chip>
        <Chip tone="accent" icon={<Play size={14} />} onClick={onStart}>Start</Chip>
        <Chip tone="accent" icon={breaking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} onClick={breaking ? undefined : onBreakDown}>
          {breaking ? "Breaking down…" : "Go deeper"}
        </Chip>
        <Chip icon={<GitBranch size={14} />} onClick={onBranch}>Add branch</Chip>
        <Chip tone="accent" icon={<MessageCircle size={14} />} onClick={() => setAsking((a) => !a)}>Ask</Chip>
        <Link href="/app/today" className="raised-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-ink">
          <CalendarPlus size={14} /> Today
        </Link>
      </div>

      {asking && (
        <div className="mt-3 border-t border-line pt-3">
          <form onSubmit={(e) => { e.preventDefault(); void ask(); }} className="inset-well flex items-center gap-2 rounded-xl p-1 pl-3.5">
            <input
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask about "${truncate(node.title, 24)}"…`}
              className="h-9 flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
            />
            <button type="submit" disabled={!question.trim() || loading} className="raised-gold grid h-8 w-8 shrink-0 place-items-center rounded-lg disabled:opacity-30" aria-label="Ask">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </form>
          {answer && <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-muted">{answer}</p>}
        </div>
      )}
    </div>
  );
}
