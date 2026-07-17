"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUp, Check, Timer, X, ChevronDown, Locate, GitBranch, Plus, Minus, Crosshair, Palette, Trash2, Sparkles, MessageCircle, Loader2, PlayCircle, Dumbbell, BookOpen, ExternalLink, NotebookPen, Wand2, ArrowDownToLine, HelpCircle, LayoutGrid, LayoutTemplate, Focus, Boxes, Share2, Save, Search, Scissors } from "lucide-react";
import type { GoalWithNodes, GoalNode, NodeStatus, NodeResource, ResourceKind, ResolvedResource } from "@/types";
import { parseDeadline } from "@/lib/kairo/deadline";
import { generateGoalMap } from "@/lib/ai/generate-goal-map";
import { expandNode, askNode } from "@/lib/ai/node-assist";
import { unblock } from "@/lib/ai/work-session";
import { draftForStep } from "@/lib/ai/draft";
import { research } from "@/lib/ai/research";
import { AiError } from "@/lib/ai/provider";
import { track } from "@/lib/analytics";
import { UpgradeModal } from "./UpgradeModal";
import { Celebration } from "./Celebration";
import { useRouter } from "next/navigation";
import type { DraftResult, ResearchResult } from "@/lib/ai/types";
import { replanGoal } from "@/lib/ai/replan";
import { viaRoute } from "@/lib/ai/provider";
import type { Clarifier, ReplanProposal, ReplanKind, GoalMapResult } from "@/lib/ai/types";
import { TEMPLATES, templateToMap, type GoalTemplate } from "@/lib/kairo/templates";
import { clarifyGoal } from "@/lib/ai/clarify";
import { GOAL_PALETTE, goalColorHex, goalColorIndex } from "@/lib/kairo/goal-color";
import { goalIcon } from "@/lib/kairo/goal-icon";
import { pickCelebration, pickGoalCelebration, fireHaptic } from "@/lib/kairo/celebrate";
import { upgradeReasonForGoalCap } from "@/lib/kairo/plans";
import { usePersistentState } from "@/lib/store/persist";
import { useTheme } from "@/lib/store/useTheme";
import { useSpeechInput } from "@/lib/hooks/use-speech-input";
import {
  persistGoalFromMap,
  addNode,
  setNodeStatus,
  setGoalDeadline,
  setGoalNotes,
  logFocusSession,
  setNodeResolvedResource,
  shareGoal,
  deleteGoal,
  deleteNode,
} from "@/lib/data/actions";
import { MicButton } from "@/components/ui/MicButton";
import { Chip } from "@/components/ui/Chip";
import { FocusOverlay } from "./FocusOverlay";
import { MappingNarration } from "./MappingNarration";
import { Markdown } from "./Markdown";
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

// "Organise" buckets a goal by the kind of icon it carries — a light-touch
// auto-sort into life areas. Icons not listed fall into "Other".
const CATEGORY_OF: Record<string, string> = {
  fitness: "Health", health: "Health", habit: "Health",
  career: "Work", rocket: "Work", growth: "Work",
  money: "Money",
  study: "Learning", school: "Learning", language: "Learning",
  code: "Digital", design: "Digital", photo: "Digital",
  music: "Creative", writing: "Creative", speaking: "Creative", trophy: "Creative",
  travel: "Travel",
  home: "Home", cooking: "Home", community: "Home",
};
const categoryOf = (icon: string | null | undefined): string => CATEGORY_OF[icon ?? ""] ?? "Other";

/** Deterministic galaxy slot for a goal by its index (used until dragged). */
function defaultPos(i: number): { x: number; y: number } {
  // A tighter galaxy: only one path opens at a time, so trees may cross — the
  // spacing just needs to keep cores well clear of each other (golden-angle
  // placement spreads them so they never collide).
  const r = 250 + 150 * Math.sqrt(i);
  const a = i * GOLDEN - Math.PI / 2;
  return { x: Math.cos(a) * (i === 0 ? 0 : r), y: Math.sin(a) * (i === 0 ? 0 : r) };
}

function nextId(nodes: GoalNode[]): string | null {
  const rank: Record<string, number> = { in_motion: 0, at_risk: 1, not_started: 2 };
  const parents = new Set(nodes.map((n) => n.parentId).filter(Boolean) as string[]);
  const actionable = nodes.filter((n) => n.status !== "done" && n.status !== "blocked");
  const byStatus = (a: GoalNode, b: GoalNode) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3) || a.priority - b.priority;
  // A milestone with sub-steps isn't itself the thing you do — prefer a real
  // leaf sub-step. Only fall back to a top-level node when nothing branches.
  const leaves = actionable.filter((n) => !parents.has(n.id)).sort(byStatus);
  return (leaves[0] ?? [...actionable].sort(byStatus)[0])?.id ?? null;
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

/** A named group of goals — drawn as a soft tinted halo + label behind its
 *  member planets. Purely a client-side organization layer (localStorage). */
interface Constellation {
  id: string;
  label: string;
  colorIdx: number;
  goalIds: string[];
}

const SPINE_RAD = 252; // distance to the next milestone along the spine
const LEAF_RAD = 166; // distance to a rib (leaf sub-step)
const SPINE_ARC = 0.11; // a slight, consistent bend — keeps the spine a clear, readable path

/**
 * Fishbone layout relative to the goal core at (0,0): milestones flow forward
 * along a gently arcing spine, and each milestone's sub-steps hang as ribs on
 * alternating sides — so subtrees stay clear of one another.
 */
function layoutTree(nodes: GoalNode[], baseDir = -Math.PI / 2): Placed[] {
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

    // Ribs: perpendicular to the spine, alternating sides, fanning out slightly.
    leaves.forEach((leaf, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const rank = Math.floor(i / 2);
      const angle = dir + side * (Math.PI / 2 - 0.08) + side * rank * 0.32;
      const rad = LEAF_RAD + rank * 54;
      out.push({ node: leaf, x: cx + Math.cos(angle) * rad, y: cy + Math.sin(angle) * rad, px: cx, py: cy, depth, spine: false });
    });

    // Spine: continue forward with a gentle arc (fan a little if several branch).
    spineKids.forEach((cont, i) => {
      const fan = spineKids.length > 1 ? (i - (spineKids.length - 1) / 2) * 0.6 : 0;
      const angle = dir + SPINE_ARC + fan;
      const x = cx + Math.cos(angle) * SPINE_RAD;
      const y = cy + Math.sin(angle) * SPINE_RAD;
      out.push({ node: cont, x, y, px: cx, py: cy, depth, spine: true });
      place(cont.id, x, y, angle, depth + 1);
    });
  };

  const roots = kids.get(null) ?? [];
  const r = roots.length;
  roots.forEach((root, i) => {
    // Open outward from the galaxy centre (baseDir); fan multiple roots around it.
    const dir = r === 1 ? baseDir : baseDir + (i / (r - 1) - 0.5) * 1.8;
    const spine = hasKids(root.id);
    const rad = spine ? SPINE_RAD : LEAF_RAD;
    const x = Math.cos(dir) * rad;
    const y = Math.sin(dir) * rad;
    out.push({ node: root, x, y, px: 0, py: 0, depth: 0, spine });
    if (spine) place(root.id, x, y, dir, 1);
  });
  return relaxOverlaps(out);
}

/**
 * Deterministic collision relaxation. The fishbone gives a clean starting shape,
 * but dense trees still jumble; this pushes any overlapping nodes apart (and keeps
 * them clear of the core), then re-anchors every connector to its parent's final
 * position so the tree reads as a legible diagram instead of a tangle. No
 * randomness, so the same goal always lays out the same way.
 */
function relaxOverlaps(placed: Placed[]): Placed[] {
  if (placed.length < 2) return placed;
  const pts = placed.map((p) => ({ ...p }));
  const idx = new Map<string, number>();
  pts.forEach((p, i) => idx.set(p.node.id, i));
  const MIN_SPINE = 142; // milestones are bigger and carry wider labels
  const MIN_LEAF = 108;
  const CORE_CLEAR = 156;
  for (let iter = 0; iter < 90; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const min = a.spine || b.spine ? MIN_SPINE : MIN_LEAF;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < min) {
          const push = (min - d) / 2, ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
          moved = true;
        }
      }
    }
    // Keep every node clear of the goal core at (0,0), which never moves.
    for (const p of pts) {
      const d = Math.hypot(p.x, p.y) || 0.001;
      if (d < CORE_CLEAR) { const push = CORE_CLEAR - d; p.x += (p.x / d) * push; p.y += (p.y / d) * push; moved = true; }
    }
    if (!moved) break;
  }
  // Re-anchor connectors to each parent's final position (core = 0,0).
  for (const p of pts) {
    const parentId = p.node.parentId;
    const pi = parentId ? idx.get(parentId) : undefined;
    if (pi !== undefined) { p.px = pts[pi].x; p.py = pts[pi].y; }
    else { p.px = 0; p.py = 0; }
  }
  return pts;
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
    icon: res.icon ?? null,
    notes: "",
    createdAt: nowISO(),
    updatedAt: nowISO(),
    archivedAt: null,
    nodes,
  };
}

const FREE_GOAL_CAP = 2;

export function GalaxyMap({
  goals: initialGoals,
  initialGoalId,
  remote = false,
  isPro = false,
  onSheetChange,
}: {
  goals: GoalWithNodes[];
  initialGoalId?: string;
  remote?: boolean;
  isPro?: boolean;
  /** Fires when a node detail sheet opens/closes, so the parent can hide overlapping UI. */
  onSheetChange?: (open: boolean) => void;
}) {
  const light = useTheme() === "light";
  const [goals, setGoals] = usePersistentState<GoalWithNodes[]>("kairo.goals.v1", initialGoals, !remote);
  const [positions, setPositions] = usePersistentState<Record<string, { x: number; y: number }>>("kairo.galaxy.v1", {});
  const [colorIdx, setColorIdx] = usePersistentState<Record<string, number>>("kairo.colors.v1", {});
  const [groups, setGroups] = usePersistentState<Constellation[]>("kairo.groups.v1", []);
  const [groupPickerFor, setGroupPickerFor] = React.useState<string | null>(null); // goalId being filed
  const [newGroupName, setNewGroupName] = React.useState("");
  // Tools toolbar: drag "New goal" onto the canvas to place it; search + focus lens.
  const [toolDrag, setToolDrag] = React.useState<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const pendingPos = React.useRef<{ x: number; y: number } | null>(null);
  const [dragOverGroup, setDragOverGroup] = React.useState<string | null>(null); // constellation a dragged planet is over
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [focusLens, setFocusLens] = React.useState(false);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  // The moment-of-intent upgrade prompt (goal cap etc.) — string = reason & open flag.
  const [upgradeReason, setUpgradeReason] = React.useState<string | null>(null);
  // The big moment: a whole goal just reached 100%. Held as a full-screen beat.
  const [goalDone, setGoalDone] = React.useState<{ title: string; sub: string; hex: string } | null>(null);

  const initialExpanded = initialGoalId ?? (initialGoals.length === 1 ? initialGoals[0].id : null);
  const [view, setView] = React.useState(() => {
    if (!initialExpanded) return { tx: 0, ty: 0, scale: 0.72 };
    const i = Math.max(0, initialGoals.findIndex((g) => g.id === initialExpanded));
    const p = defaultPos(i);
    const scale = 0.82;
    return { tx: -p.x * scale, ty: -p.y * scale, scale };
  });
  const [animating, setAnimating] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(initialExpanded);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  // Let the parent (MapView) hide the Ask Sola button while a node sheet covers it.
  React.useEffect(() => { onSheetChange?.(!!selectedNodeId); }, [selectedNodeId, onSheetChange]);
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
  const [pending, setPending] = React.useState<{ prompt: string; clarifiers: Clarifier[]; loading: boolean } | null>(null);
  const [formingPos, setFormingPos] = React.useState<{ x: number; y: number } | null>(null);
  const [focusNode, setFocusNode] = React.useState<GoalNode | null>(null);
  const [breakdownFor, setBreakdownFor] = React.useState<GoalNode | null>(null);
  const [breakdownText, setBreakdownText] = React.useState("");
  const [browsingTemplates, setBrowsingTemplates] = React.useState(false);
  const [replanForId, setReplanForId] = React.useState<string | null>(null);
  const [replanLoading, setReplanLoading] = React.useState(false);
  const [proposals, setProposals] = React.useState<(ReplanProposal & { pid: string })[]>([]);

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

  // Give every goal a DISTINCT palette slot so no two share a color. Goal ids
  // are random uuids, so the preferred pick is already varied; we only resolve
  // collisions into the nearest free slot. Persists (localStorage) so every tab
  // shows the same color.
  React.useEffect(() => {
    setColorIdx((prev) => {
      const used = new Set<number>();
      for (const g of goals) if (prev[g.id] !== undefined) used.add(prev[g.id]);
      let next = prev;
      const N = GOAL_PALETTE.length;
      for (const g of goals) {
        if (prev[g.id] !== undefined) continue;
        let idx = goalColorIndex(g.id);
        if (used.has(idx)) {
          const free = Array.from({ length: N }, (_, i) => i).filter((i) => !used.has(i));
          idx = free.length ? free[goalColorIndex(g.id) % free.length] : idx;
        }
        used.add(idx);
        if (next === prev) next = { ...prev };
        next[g.id] = idx;
      }
      return next;
    });
  }, [goals, setColorIdx]);

  const expanded = goals.find((g) => g.id === expandedId) ?? null;
  const selectedNode = expanded?.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const dirty = view.tx !== 0 || view.ty !== 0 || Math.abs(view.scale - 0.72) > 0.01;

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
    setView({ tx: 0, ty: 0, scale: 0.72 });
    setSelectedNodeId(null);
  };

  // Mouse-friendly navigation: buttons for people who'd rather not drag/scroll to
  // get around the map. Zoom steps around the centre; focus flies to the next step.
  const zoomBy = (factor: number) => {
    setAnimating(true);
    setView((v) => ({ ...v, scale: clamp(v.scale * factor, 0.35, 2.4) }));
  };
  const focusCurrent = () => {
    if (!expanded) { overview(); return; }
    const i = goals.findIndex((g) => g.id === expanded.id);
    const p = positions[expanded.id] ?? defaultPos(i);
    const baseDir = Math.hypot(p.x, p.y) < 60 ? -Math.PI / 2 : Math.atan2(p.y, p.x);
    const np = layoutTree(expanded.nodes, baseDir).find((pl) => pl.node.id === nextId(expanded.nodes));
    const scale = 1.05;
    setAnimating(true);
    setView({ tx: -(p.x + (np?.x ?? 0)) * scale, ty: -(p.y + (np?.y ?? 0)) * scale, scale });
  };

  // ---- constellations (grouping goals into named life-areas) ----
  const groupOf = React.useCallback((goalId: string) => groups.find((gr) => gr.goalIds.includes(goalId)) ?? null, [groups]);

  // Soft nebula halos behind each constellation's members, sized to enclose them.
  const constellations = React.useMemo(() => {
    const out: { id: string; label: string; hex: string; cx: number; cy: number; radius: number }[] = [];
    for (const gr of groups) {
      const pts = gr.goalIds
        .map((id) => { const i = goals.findIndex((g) => g.id === id); return i >= 0 ? posOf(id, i) : null; })
        .filter((p): p is { x: number; y: number } => p !== null);
      if (pts.length === 0) continue;
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const radius = Math.max(150, ...pts.map((p) => Math.hypot(p.x - cx, p.y - cy))) + 120;
      out.push({ id: gr.id, label: gr.label, hex: GOAL_PALETTE[gr.colorIdx % GOAL_PALETTE.length].hex, cx, cy, radius });
    }
    return out;
  }, [groups, goals, posOf]);
  // Halos are an overview cue only — they fade as you zoom in or open a goal, so a
  // tree never competes with a ring.
  const groupOpacity = expandedId ? 0 : clamp(1 - (view.scale - 0.9) / 0.5, 0, 1);

  const fileGoal = (groupId: string, goalId: string) => {
    setGroups((prev) => {
      const inIt = prev.find((gr) => gr.id === groupId)?.goalIds.includes(goalId);
      return prev
        .map((gr) => ({
          ...gr,
          goalIds: gr.id === groupId
            ? inIt ? gr.goalIds.filter((x) => x !== goalId) : [...gr.goalIds, goalId]
            : gr.goalIds.filter((x) => x !== goalId), // a goal lives in one constellation
        }))
        .filter((gr) => gr.goalIds.length > 0); // drop emptied constellations
    });
  };
  const createConstellation = (label: string, goalId: string) => {
    const name = label.trim().slice(0, 40);
    if (!name) return;
    const used = new Set(groups.map((gr) => gr.colorIdx));
    const cIdx = Array.from({ length: GOAL_PALETTE.length }, (_, i) => i).find((i) => !used.has(i)) ?? groups.length % GOAL_PALETTE.length;
    setGroups((prev) => [
      ...prev.map((gr) => ({ ...gr, goalIds: gr.goalIds.filter((x) => x !== goalId) })).filter((gr) => gr.goalIds.length > 0),
      { id: newId(), label: name, colorIdx: cIdx, goalIds: [goalId] },
    ]);
    setNewGroupName("");
  };

  // "Tidy": snap every planet onto a clean, evenly-spaced grid centred on the
  // origin. Constellation members are ordered contiguously so a group stays a tight
  // block rather than getting scattered across the grid.
  const tidy = () => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const gr of groups) for (const id of gr.goalIds) if (!seen.has(id) && goals.some((g) => g.id === id)) { seen.add(id); order.push(id); }
    for (const g of goals) if (!seen.has(g.id)) order.push(g.id);
    const n = order.length;
    const cols = Math.max(1, Math.round(Math.sqrt(n * 1.6))); // a touch wider than tall
    const rows = Math.ceil(n / cols);
    const CX = 330, CY = 300;
    const next: Record<string, { x: number; y: number }> = {};
    order.forEach((id, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      // the last row is short — centre it under the rest
      const inRow = row === rows - 1 ? n - row * cols : cols;
      next[id] = { x: (col - (inRow - 1) / 2) * CX, y: (row - (rows - 1) / 2) * CY };
    });
    setAnimating(true);
    setView({ tx: 0, ty: 0, scale: 0.72 }); // frame the whole grid
    setPositions(next);
    setSelectedNodeId(null);
    showToast("Tidied up");
  };

  // "Organise": auto-sort goals into groups by icon (Health, Work, Travel, Digital,
  // …). It respects the groups you've already made — only the goals that aren't in a
  // group get sorted; existing groups keep their members and labels.
  const organize = () => {
    if (goals.length === 0) return;
    const alive = (id: string) => goals.some((g) => g.id === id);
    const existing = groups
      .map((gr) => ({ ...gr, goalIds: gr.goalIds.filter(alive) }))
      .filter((gr) => gr.goalIds.length > 0);
    const grouped = new Set(existing.flatMap((gr) => gr.goalIds));
    const loose = goals.filter((g) => !grouped.has(g.id));

    // Bucket only the loose goals by life area.
    const buckets = new Map<string, string[]>();
    for (const g of loose) {
      const cat = categoryOf(g.icon);
      (buckets.get(cat) ?? buckets.set(cat, []).get(cat)!).push(g.id);
    }
    // New groups only for areas with 2+ loose goals (no lonely halos); pick colours
    // that don't clash with the groups you already have.
    const used = new Set(existing.map((gr) => gr.colorIdx));
    const nextColor = () => {
      const i = Array.from({ length: GOAL_PALETTE.length }, (_, k) => k).find((k) => !used.has(k)) ?? used.size % GOAL_PALETTE.length;
      used.add(i);
      return i;
    };
    const newGroups: Constellation[] = [...buckets.entries()]
      .filter(([, ids]) => ids.length >= 2)
      .map(([label, goalIds]) => ({ id: newId(), label, colorIdx: nextColor(), goalIds }));

    const allGroups = [...existing, ...newGroups];
    // Lay out every group as its own cluster, then each still-loose goal on its own.
    const inAGroup = new Set(allGroups.flatMap((gr) => gr.goalIds));
    const singles = goals.filter((g) => !inAGroup.has(g.id)).map((g) => [g.id]);
    const clusters: string[][] = [...allGroups.map((gr) => gr.goalIds), ...singles];

    const cols = Math.max(1, Math.ceil(Math.sqrt(clusters.length)));
    const rows = Math.ceil(clusters.length / cols);
    const CX = 560, CY = 500;
    const next: Record<string, { x: number; y: number }> = {};
    clusters.forEach((ids, ci) => {
      const col = ci % cols, row = Math.floor(ci / cols);
      const cx = (col - (cols - 1) / 2) * CX;
      const cy = (row - (rows - 1) / 2) * CY;
      ids.forEach((id, k) => {
        if (ids.length === 1) { next[id] = { x: cx, y: cy }; return; }
        const a = k * GOLDEN;
        const r = 96 + 20 * Math.sqrt(k);
        next[id] = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
      });
    });
    setGroups(allGroups);
    setAnimating(true);
    setView({ tx: 0, ty: 60, scale: 0.66 }); // frame the clusters, nudged down so top labels clear the chrome
    setPositions(next);
    setSelectedNodeId(null);
    setExpandedId(null);
    showToast(allGroups.length ? `Organised into ${allGroups.length} group${allGroups.length === 1 ? "" : "s"}` : "Organised your goals");
  };

  // Screen point → map coordinates (invert the centered translate + scale transform).
  const screenToMap = (sx: number, sy: number) => {
    const r = viewportRef.current?.getBoundingClientRect();
    const cx = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const cy = r ? r.top + r.height / 2 : window.innerHeight / 2;
    return { x: (sx - cx - view.tx) / view.scale, y: (sy - cy - view.ty) / view.scale };
  };

  // Which constellation zone a point falls in — optionally excluding one goal so a
  // dragged member tests against its group's OTHER members.
  const groupAtPoint = (x: number, y: number, excludeGoalId?: string) => {
    for (const gr of groups) {
      const pts = gr.goalIds
        .filter((gid) => gid !== excludeGoalId)
        .map((gid) => { const i = goals.findIndex((g) => g.id === gid); return i >= 0 ? posOf(gid, i) : null; })
        .filter((p): p is { x: number; y: number } => p !== null);
      if (pts.length === 0) continue;
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const radius = Math.max(150, ...pts.map((p) => Math.hypot(p.x - cx, p.y - cy))) + 120;
      if (Math.hypot(x - cx, y - cy) <= radius) return gr;
    }
    return null;
  };

  // ---- toolbar: drag "New goal" from the rail onto the canvas to place it there ----
  // Listeners are attached synchronously on pointerdown (not via an effect), so even
  // an instant tap catches its pointerup. A tap opens the composer; a real drag onto
  // the canvas also stashes the drop point so the new goal lands right there.
  const startGoalDrag = (e: React.PointerEvent) => {
    const ox = e.clientX, oy = e.clientY;
    setToolDrag({ ox, oy, sx: ox, sy: oy });
    const onMove = (ev: PointerEvent) => setToolDrag((t) => (t ? { ...t, sx: ev.clientX, sy: ev.clientY } : t));
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      setToolDrag(null);
      // A tap (no real movement) is handled by the button's onClick; here we only
      // handle an actual drag that lands on the canvas — drop the goal right there.
      if (Math.hypot(ev.clientX - ox, ev.clientY - oy) <= 6) return;
      const r = viewportRef.current?.getBoundingClientRect();
      const inside = r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      if (!inside) return;
      pendingPos.current = screenToMap(ev.clientX, ev.clientY);
      setExpandedId(null);
      setComposing(true);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  // Search: a goal matches when its title or any of its steps match the query.
  const q = query.trim().toLowerCase();
  const goalMatches = (g: GoalWithNodes) => !q || g.title.toLowerCase().includes(q) || g.nodes.some((n) => n.title.toLowerCase().includes(q));

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
    const nx = d.ox + (e.clientX - d.sx) / view.scale;
    const ny = d.oy + (e.clientY - d.sy) / view.scale;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
    setAnimating(false);
    setPositions((p) => ({ ...p, [d.id]: { x: nx, y: ny } }));
    if (d.moved) { const gr = groupAtPoint(nx, ny, d.id); setDragOverGroup((prev) => (prev === (gr?.id ?? null) ? prev : gr?.id ?? null)); }
  };
  const onPlanetUp = (e: React.PointerEvent, id: string) => {
    const d = goalDrag.current;
    goalDrag.current = null;
    setDragOverGroup(null);
    if (!d) return;
    if (!d.moved) {
      e.stopPropagation();
      if (expandedId === id) { setExpandedId(null); overview(); }
      else { setExpandedId(id); setSelectedNodeId(null); flyTo(id); }
      return;
    }
    // Dropped inside a constellation it isn't part of? File it there (drag-to-group).
    const fx = d.ox + (e.clientX - d.sx) / view.scale;
    const fy = d.oy + (e.clientY - d.sy) / view.scale;
    const over = groupAtPoint(fx, fy, id);
    const cur = groupOf(id);
    if (over && over.id !== cur?.id) { fileGoal(over.id, id); showToast(`Added to ${over.label}`); }
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
      // If this was the final step, the whole goal just landed — the biggest win in
      // the app deserves its own beat, not just another node pop.
      const g = goals.find((x) => x.id === goalId);
      if (g && g.nodes.length > 1 && g.nodes.every((n) => n.id === id || n.status === "done")) {
        const line = pickGoalCelebration(goalId);
        setGoalDone({ title: line.title, sub: line.sub, hex: hexOf(goalId) });
        fireHaptic([12, 50, 12, 50, 16]);
      }
    }
    if (remote) void setNodeStatus({ goalId, nodeId: id, status });
  };

  const addBranch = (goalId: string, parentId: string | null, title: string, minutes = 30) => {
    const text = title.trim();
    if (!text) return;
    const g = goals.find((x) => x.id === goalId);
    if (!g) return;
    const id = newId();
    const node: GoalNode = {
      id, goalId, parentId, title: text.replace(/\s+/g, " ").replace(/[.?!]+$/, ""),
      description: "", status: "not_started", progress: 0, priority: 3, estimatedMinutes: minutes,
      dueDate: null, positionX: null, positionY: null, aiReason: "Added from the map", resource: null,
      createdAt: nowISO(), updatedAt: nowISO(),
    };
    setGoals((prev) => prev.map((x) => (x.id === goalId ? { ...x, nodes: [...x.nodes, node] } : x)));
    if (remote) void addNode({ id, goalId, title: node.title, estimatedMinutes: minutes, sortOrder: g.nodes.length, parentId });
  };

  const setDeadline = (goalId: string, text: string) => {
    const parsed = parseDeadline(text);
    if (!parsed) { showToast("Couldn't read that date. Try \"by March\" or \"in 6 weeks\"."); return false; }
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

  // Remove a step and everything hanging off it, then recompute progress.
  const removeNode = (goalId: string, nodeId: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const remove = new Set([nodeId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const n of g.nodes) if (n.parentId && remove.has(n.parentId) && !remove.has(n.id)) { remove.add(n.id); changed = true; }
        }
        const nodes = g.nodes.filter((n) => !remove.has(n.id));
        const done = nodes.filter((n) => n.status === "done").length;
        const progress = nodes.length ? Math.round((done / nodes.length) * 100) : 0;
        return { ...g, nodes, progress };
      })
    );
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (remote) void deleteNode({ goalId, nodeId });
    showToast("Step removed");
  };

  // Right-click context menu on a node or a goal core (node = null → the goal core).
  const [ctx, setCtx] = React.useState<{ x: number; y: number; goalId: string; node: GoalNode | null } | null>(null);
  React.useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCtx(null); };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); window.removeEventListener("keydown", onKey); };
  }, [ctx]);

  // Free plan is capped at 2 active goals; Pro is unlimited.
  const atGoalCap = () => {
    if (isPro) return false;
    if (goals.filter((g) => g.status === "active").length < FREE_GOAL_CAP) return false;
    // The strongest buy signal in the app — meet it with a one-tap upgrade, not a toast.
    setUpgradeReason(upgradeReasonForGoalCap(FREE_GOAL_CAP));
    return true;
  };

  // Step 1: user submits a goal → fetch a couple tailored questions (small AI
  // call), shown before the plan is generated.
  const startCreate = async (text: string) => {
    const p = text.trim();
    if (!p || mapping) return;
    if (atGoalCap()) { setComposing(false); return; }
    setComposing(false);
    setPrompt("");
    setPending({ prompt: p, clarifiers: [], loading: true });
    const clar = await clarifyGoal(p);
    setPending((cur) => (cur && cur.prompt === p ? { prompt: p, clarifiers: clar, loading: false } : cur));
  };

  // Step 2: they answer (or skip) → generate the plan ONCE with the answers folded in.
  const finishCreate = (answers: Record<string, string>, extra: string) => {
    const pend = pending;
    if (!pend) return;
    setPending(null);
    const parts = Object.entries(answers).filter(([, a]) => a).map(([q, a]) => `${q.replace(/\?$/, "")}: ${a}`);
    if (extra.trim()) parts.push(extra.trim());
    void createGoal(parts.length ? `${pend.prompt} — ${parts.join("; ")}` : pend.prompt);
  };

  // Fly to the spot the new planet will occupy and coalesce it there. If the goal
  // was dropped onto the canvas from the toolbar, use that spot instead of a slot.
  const beginForming = () => {
    const pos = pendingPos.current ?? defaultPos(goals.length);
    pendingPos.current = null;
    const scale = 0.82;
    setFormingPos(pos);
    setMapping(true);
    setAnimating(true);
    setView({ tx: -pos.x * scale, ty: -pos.y * scale, scale });
    return pos;
  };

  // Persist a finished map (from generation OR a template) and drop it on the map.
  const commitMap = async (res: GoalMapResult, pos: { x: number; y: number }) => {
    let goalId = newId();
    let nodeIds: string[] | undefined;
    if (remote) {
      const saved = await persistGoalFromMap({ result: res });
      if (saved.ok && saved.id) { goalId = saved.id; nodeIds = saved.nodeIds; }
    }
    const goal = toLocalGoal(goalId, res, nodeIds);
    setPositions((pp) => ({ ...pp, [goalId]: pos }));
    setGoals((prev) => [...prev, goal]);
    setMapping(false);
    setFormingPos(null);
    setExpandedId(goalId);
    setSelectedNodeId(null);
  };

  const createGoal = async (text: string) => {
    const p = text.trim();
    if (!p || mapping) return;
    const pos = beginForming();
    const res = await generateGoalMap({ prompt: p });
    if (res.isMock) {
      // AI was unavailable / rate-limited — don't persist a junk placeholder map.
      setMapping(false); setFormingPos(null);
      showToast("Couldn't map that. You may have hit today's AI limit. Try later or upgrade.");
      return;
    }
    await commitMap(res, pos);
  };

  // Adopt a starter template — a pre-built map, so NO AI call (instant + free).
  const adoptTemplate = async (t: GoalTemplate) => {
    if (mapping || atGoalCap()) return;
    setComposing(false);
    setBrowsingTemplates(false);
    const pos = beginForming();
    await commitMap(templateToMap(t, Date.now()), pos);
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
        aiReason: "Sola broke this down", resource: null, createdAt: nowISO(), updatedAt: nowISO(),
      };
    });
    setGoals((prev) => prev.map((x) => (x.id === goalId ? { ...x, nodes: [...x.nodes, ...created] } : x)));
  };

  // Break a step into sub-steps, optionally personalized with the user's context.
  const runBreakDown = async (node: GoalNode, context: string) => {
    if (!expanded || assisting) return;
    setBreakdownFor(null);
    setBreakdownText("");
    setAssisting(true);
    const ctx = [context.trim(), expanded.notes.trim()].filter(Boolean).join(" · ").slice(0, 600) || undefined;
    try {
      const res = await expandNode({
        goalTitle: expanded.title,
        nodeTitle: node.title,
        nodeDescription: node.description,
        context: ctx,
      });
      if (res.steps.length) addSteps(expanded.id, node.id, res.steps);
      showToast(`Added ${res.steps.length} step${res.steps.length === 1 ? "" : "s"} under "${truncate(node.title, 20)}"`);
    } catch (e) {
      // A rate-limit / upgrade response now surfaces instead of silently adding
      // generic filler steps and claiming success.
      if (e instanceof AiError) {
        showToast(e.message);
        if (e.upgrade) router.push("/app/billing");
      } else {
        showToast("Couldn't break that down. Try again.");
      }
    } finally {
      setAssisting(false);
    }
  };

  // "Make it smaller" — one tap breaks a daunting step into tiny, almost-silly
  // micro-steps so an overwhelmed user can just start (Fogg / Goblin Tools).
  const runMakeSmaller = async (node: GoalNode) => {
    if (!expanded || assisting) return;
    setAssisting(true);
    const ctx = expanded.notes.trim().slice(0, 600) || undefined;
    try {
      const res = await expandNode({ goalTitle: expanded.title, nodeTitle: node.title, nodeDescription: node.description, context: ctx, tiny: true });
      if (res.steps.length) addSteps(expanded.id, node.id, res.steps);
      showToast(`Broke "${truncate(node.title, 16)}" into ${res.steps.length} tiny step${res.steps.length === 1 ? "" : "s"}`);
    } catch (e) {
      if (e instanceof AiError) {
        showToast(e.message);
        if (e.upgrade) router.push("/app/billing");
      } else {
        showToast("Couldn't do that. Try again.");
      }
    } finally {
      setAssisting(false);
    }
  };

  // Enter a focus session on a step (marks it in-motion; completing marks it done).
  const openFocus = (node: GoalNode) => {
    if (!expanded) return;
    if (node.status !== "done") setStatus(expanded.id, node.id, "in_motion");
    track("focus_started", { goalId: expanded.id, surface: "map" });
    setFocusNode(node);
  };

  // Append a co-produced draft to the goal's notebook (keeps map + Notebook in sync).
  const appendGoalNote = (goalId: string, label: string, body: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const stamp = `--- ${label} ---\n${body.trim()}\n`;
        const notes = (g.notes ? `${g.notes.trim()}\n\n` : "") + stamp;
        if (remote) void setGoalNotes({ goalId, notes });
        return { ...g, notes };
      })
    );
    showToast("Saved to notebook");
  };

  // The living map: ask Solaspace where the plan should adapt to the user's real
  // progress. Proposals are additive and shown for accept/dismiss — never auto-applied.
  const runReplan = async (goalId: string) => {
    const g = goals.find((x) => x.id === goalId);
    if (!g) return;
    setReplanForId(goalId);
    setProposals([]);
    setReplanLoading(true);
    const res = await replanGoal({
      goalTitle: g.title,
      nodes: g.nodes.map((n) => ({ title: n.title, status: n.status })),
      context: g.notes.trim() || undefined,
    });
    setProposals(res.proposals.map((p) => ({ ...p, pid: newId() })));
    setReplanLoading(false);
  };

  // Share a goal as a public read-only link (copies it to the clipboard).
  const shareGoalLink = async (goalId: string) => {
    if (!remote) { showToast("Sign in to share your map"); return; }
    const res = await shareGoal({ goalId });
    if (!res.ok || !res.token) { showToast("Couldn't create a link"); return; }
    const url = `${window.location.origin}/s/${res.token}`;
    try { await navigator.clipboard.writeText(url); showToast("Share link copied"); }
    catch { showToast(url); }
  };

  const acceptProposal = (p: ReplanProposal & { pid: string }) => {
    const g = goals.find((x) => x.id === replanForId);
    if (!g) return;
    const key = p.parentTitle?.trim().toLowerCase();
    const parentId = key ? g.nodes.find((n) => n.title.trim().toLowerCase() === key)?.id ?? null : null;
    addBranch(g.id, parentId, p.title, p.estimatedMinutes);
    setProposals((prev) => prev.filter((x) => x.pid !== p.pid));
    showToast(`Added “${truncate(p.title, 22)}”`);
  };

  // Cache a real resolved resource (live video) on the node once found.
  const resolveNodeResource = (nodeId: string, resolved: ResolvedResource) => {
    setGoals((prev) =>
      prev.map((g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === nodeId && n.resource ? { ...n, resource: { ...n.resource, resolved } } : n)),
      }))
    );
    if (remote) void setNodeResolvedResource({ nodeId, resolved });
  };

  const transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;
  const empty = goals.length === 0;

  return (
    <div ref={viewportRef} className="absolute inset-0 overflow-hidden">
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
          {/* constellation halos — soft tinted nebulae behind grouped planets. The
              one a dragged planet hovers over brightens to signal it'll be filed there. */}
          {(groupOpacity > 0 || dragOverGroup) && constellations.map((c) => {
            const active = dragOverGroup === c.id;
            return (
              <div key={c.id} className="pointer-events-none absolute" style={{ left: c.cx, top: c.cy, opacity: active ? 1 : groupOpacity, transition: "opacity 0.3s ease" }}>
                <div className="rounded-full" style={{ position: "absolute", left: -c.radius, top: -c.radius, width: c.radius * 2, height: c.radius * 2, background: light ? `radial-gradient(circle, ${c.hex}${active ? "40" : "24"}, ${c.hex}${active ? "1c" : "12"} 46%, transparent 70%)` : `radial-gradient(circle, ${c.hex}${active ? "3a" : "1f"}, ${c.hex}${active ? "16" : "0d"} 46%, transparent 70%)` }} />
                <span className="absolute left-0 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-[0.24em]" style={{ top: -c.radius - 6, color: light ? `color-mix(in srgb, ${c.hex} 70%, #2a2f3a)` : c.hex, opacity: active ? 1 : 0.85, textShadow: "var(--map-label-shadow)" }}>{c.label}</span>
              </div>
            );
          })}

          {goals.map((g, i) => (
            <GoalCluster
              key={g.id}
              goal={g}
              light={light}
              pos={posOf(g.id, i)}
              hex={hexOf(g.id)}
              expanded={expandedId === g.id}
              dimmed={(expandedId != null && expandedId !== g.id) || (searchOpen && q.length > 0 && !goalMatches(g))}
              focusLens={focusLens}
              hovered={hoverId === g.id}
              selectedNodeId={selectedNodeId}
              poppedId={poppedId}
              onPlanetDown={(e) => onPlanetDown(e, g.id, i)}
              onPlanetUp={(e) => onPlanetUp(e, g.id)}
              onEnter={() => setHoverId(g.id)}
              onLeave={() => setHoverId((h) => (h === g.id ? null : h))}
              onSelectNode={(nid) => setSelectedNodeId(nid)}
              onNodeContext={(node, e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, goalId: g.id, node }); }}
              onCoreContext={(e) => { e.preventDefault(); setExpandedId(g.id); setCtx({ x: e.clientX, y: e.clientY, goalId: g.id, node: null }); }}
            />
          ))}

          {/* a planet coalescing at the exact spot the new goal will occupy */}
          {mapping && formingPos && (
            <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: formingPos.x, top: formingPos.y }}>
              <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border border-accent/40" />
              <span className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-pulse-soft rounded-full" style={{ background: "radial-gradient(circle, rgba(230,184,119,0.4), transparent 70%)" }} />
              <span className="block h-14 w-14 animate-pulse-soft rounded-full" style={{ background: light ? "radial-gradient(circle at 34% 26%, #ffffff 0%, #e6b877 52%, var(--orb-core-deep) 100%)" : "radial-gradient(circle at 34% 26%, #fdf3e0 0%, #e6b877 46%, #1a130a 100%)", boxShadow: light ? "0 8px 20px -6px rgba(120,84,30,0.4)" : "0 0 44px rgba(230,184,119,0.55)" }} />
            </div>
          )}
        </div>

        {mapping && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[calc(120px+env(safe-area-inset-bottom))] z-10 text-center md:bottom-24">
            <p className="font-display text-[15px] text-ink">Mapping your goal…</p>
            <MappingNarration />
          </div>
        )}

        {empty && !mapping && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center pb-44">
            <div className="grid max-w-xs place-items-center px-6 text-center">
              <span className="rounded-full" style={{ width: 96, height: 96, background: light ? "radial-gradient(circle at 36% 28%, #ffffff 0%, #e6b877 52%, var(--orb-core-deep) 100%)" : "radial-gradient(circle at 36% 28%, #fdf3e0 0%, #e6b877 46%, #1a130a 100%)", boxShadow: light ? "0 10px 26px -8px rgba(120,84,30,0.35)" : "0 0 60px rgba(230,184,119,0.28)", animation: "breathe 6s ease-in-out infinite" }} />
              <p className="mt-7 font-display text-xl font-semibold text-ink">What do you want to do?</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">Type a goal below and Solaspace maps every step for you.</p>
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
            className="chrome pointer-events-auto inline-flex max-w-[40vw] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-ink disabled:opacity-40 sm:max-w-[56vw]"
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
                  {React.createElement(goalIcon(g.icon), { size: 16, className: "shrink-0", style: { color: hexOf(g.id) } })}
                  <span className="min-w-0 flex-1 truncate">{g.title}</span>
                  <span className="shrink-0 font-mono text-[11px] text-faint">{Math.round(g.progress)}%</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* left tools rail — create, browse, find, focus, tidy. Drag "New goal" onto
          the canvas to drop a goal exactly where you let go. */}
      {!empty && (
        <div className="pointer-events-none absolute left-4 top-[calc(env(safe-area-inset-top)+56px)] z-30 flex flex-col items-center gap-1.5 md:top-20">
          <button
            onPointerDown={startGoalDrag}
            onClick={() => setComposing(true)}
            className="raised-gold pointer-events-auto grid h-10 w-10 cursor-grab touch-none select-none place-items-center rounded-full active:cursor-grabbing"
            aria-label="New goal — click, or drag onto the map to place it"
            title="New goal — drag onto the map to place it"
          >
            <Plus size={18} />
          </button>
          <div className="chrome pointer-events-auto flex flex-col items-center gap-0.5 rounded-full p-1">
            <button onClick={() => setBrowsingTemplates(true)} className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:text-ink" aria-label="Starter templates" title="Starter templates"><LayoutTemplate size={16} /></button>
            <button onClick={() => { setSearchOpen((s) => !s); setQuery(""); }} aria-pressed={searchOpen} className={cn("grid h-9 w-9 place-items-center rounded-full transition-colors", searchOpen ? "text-accent" : "text-muted hover:text-ink")} aria-label="Find on the map" title="Find on the map"><Search size={16} /></button>
            <button onClick={() => setFocusLens((f) => !f)} aria-pressed={focusLens} className={cn("grid h-9 w-9 place-items-center rounded-full transition-colors", focusLens ? "text-accent" : "text-muted hover:text-ink")} aria-label="Focus mode" title="Focus mode — dim all but your next steps"><Focus size={16} /></button>
            {goals.length > 1 && (
              <button onClick={organize} className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:text-ink" aria-label="Sort into groups" title="Sort into groups (Health, Work, Travel…)"><Boxes size={16} /></button>
            )}
            {goals.length > 1 && (
              <button onClick={tidy} className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:text-ink" aria-label="Tidy up" title="Tidy into a clean grid"><LayoutGrid size={15} /></button>
            )}
          </div>
          {searchOpen && (
            <div className="chrome animate-fade-in pointer-events-auto flex items-center gap-1.5 rounded-full px-2.5 py-1">
              <Search size={13} className="shrink-0 text-faint" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { const m = goals.find(goalMatches); if (m) { setExpandedId(m.id); setSelectedNodeId(null); flyTo(m.id); setSearchOpen(false); } }
                  else if (e.key === "Escape") { setSearchOpen(false); setQuery(""); }
                }}
                placeholder="Find a goal or step…"
                className="h-7 w-40 bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none"
              />
              {query && <button onClick={() => setQuery("")} className="shrink-0 text-faint transition-colors hover:text-ink" aria-label="Clear"><X size={13} /></button>}
            </div>
          )}
        </div>
      )}

      {/* right rail — view controls: zoom, jump-to-next, recenter. */}
      {!empty && (
        <div className="pointer-events-none absolute right-4 top-[calc(env(safe-area-inset-top)+56px)] z-10 flex flex-col items-center gap-1.5 md:top-20">
          <div className="chrome pointer-events-auto flex flex-col overflow-hidden rounded-full">
            <button onClick={() => zoomBy(1.25)} className="grid h-9 w-9 place-items-center text-muted transition-colors hover:text-ink" aria-label="Zoom in" title="Zoom in">
              <Plus size={16} />
            </button>
            <span className="mx-auto h-px w-4 bg-line" aria-hidden />
            <button onClick={() => zoomBy(0.8)} className="grid h-9 w-9 place-items-center text-muted transition-colors hover:text-ink" aria-label="Zoom out" title="Zoom out">
              <Minus size={16} />
            </button>
          </div>
          {expanded && (
            <button onClick={focusCurrent} className="chrome pointer-events-auto grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:text-ink" aria-label="Jump to your next step" title="Jump to your next step">
              <Crosshair size={15} />
            </button>
          )}
          {dirty && (
            <button onClick={overview} className="chrome pointer-events-auto grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:text-ink" aria-label="Recenter" title="See all goals">
              <Locate size={15} />
            </button>
          )}
        </div>
      )}

      {/* bottom: contextual bar */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-6">
        <div className="mx-auto max-w-md">
          {toast && (
            <div className="chrome mb-2 animate-fade-in rounded-xl px-4 py-2 text-center text-[13px] text-accent">
              {toast}
            </div>
          )}

          {/* a couple quick questions BEFORE generating — one AI call total */}
          {pending && !mapping ? (
            <PreGenClarifier
              clarifiers={pending.clarifiers}
              loading={pending.loading}
              onCreate={finishCreate}
              onCancel={() => setPending(null)}
            />
          ) : (composing || empty) && !mapping ? (
            <NewGoalBar
              value={prompt}
              onChange={setPrompt}
              onSubmit={() => void startCreate(prompt)}
              speech={speech}
              empty={empty}
              onBrowse={() => setBrowsingTemplates(true)}
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
          ) : breakdownFor && expanded ? (
            <form
              onSubmit={(e) => { e.preventDefault(); void runBreakDown(breakdownFor, breakdownText); }}
              className="chrome animate-sheet-up flex items-center gap-2 rounded-2xl p-1.5 pl-4"
            >
              <Sparkles size={15} className="shrink-0 text-accent" />
              <input
                autoFocus
                value={breakdownText}
                onChange={(e) => setBreakdownText(e.target.value)}
                placeholder="Personalize the breakdown… (optional)"
                className="h-10 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
              />
              <button type="button" onClick={() => { setBreakdownFor(null); setBreakdownText(""); }} className="grid h-9 w-9 place-items-center rounded-xl text-faint hover:text-ink" aria-label="Cancel"><X size={16} /></button>
              <button type="submit" className="raised-gold inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[13px] font-medium">Break down</button>
            </form>
          ) : replanForId && expanded ? (
            <ReplanSheet
              hex={hexOf(expanded.id)}
              loading={replanLoading}
              proposals={proposals}
              onAccept={acceptProposal}
              onDismiss={(pid) => setProposals((prev) => prev.filter((x) => x.pid !== pid))}
              onClose={() => { setReplanForId(null); setProposals([]); }}
            />
          ) : selectedNode && expanded ? (
            <NodeSheet
              key={selectedNode.id}
              node={selectedNode}
              hex={hexOf(expanded.id)}
              goalTitle={expanded.title}
              goalNotes={expanded.notes}
              breaking={assisting}
              isPro={isPro}
              onToast={showToast}
              onClose={() => setSelectedNodeId(null)}
              onDone={() => { setStatus(expanded.id, selectedNode.id, "done"); track("step_completed", { goalId: expanded.id, surface: "map" }); }}
              onFocus={() => openFocus(selectedNode)}
              onDelete={() => { removeNode(expanded.id, selectedNode.id); setSelectedNodeId(null); }}
              onBranch={() => setBranchFor(selectedNode.id)}
              onBreakDown={() => setBreakdownFor(selectedNode)}
              onMakeSmaller={() => void runMakeSmaller(selectedNode)}
              onResolveResource={resolveNodeResource}
              onSaveArtifact={(label, body) => appendGoalNote(expanded.id, `${label} · ${selectedNode.title}`, body)}
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
              onAdapt={() => void runReplan(expanded.id)}
              onShare={() => void shareGoalLink(expanded.id)}
              onGroup={() => { setGroupPickerFor(expanded.id); setNewGroupName(""); }}
              onClose={() => { setExpandedId(null); overview(); }}
            />
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="chrome flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] text-muted transition-colors hover:text-ink"
            >
              <Plus size={16} className="text-accent" /> New goal
              <span className="mx-1 text-faint">·</span>
              <span className="text-faint">tap a goal to open it</span>
            </button>
          )}
        </div>
      </div>

      {browsingTemplates && (
        <TemplateGallery
          onPick={(t) => void adoptTemplate(t)}
          onClose={() => setBrowsingTemplates(false)}
        />
      )}

      {focusNode && expanded && (
        <FocusOverlay
          key={focusNode.id}
          title={focusNode.title}
          goalTitle={expanded.title}
          nodeDescription={focusNode.description}
          context={expanded.notes.trim() || undefined}
          hex={hexOf(expanded.id)}
          onComplete={(mins) => {
            setStatus(expanded.id, focusNode.id, "done");
            if (remote) void logFocusSession({ goalId: expanded.id, nodeId: focusNode.id, minutes: mins });
            setFocusNode(null);
            setSelectedNodeId(null);
            showToast("Step complete");
          }}
          onClose={() => setFocusNode(null)}
          onSaveArtifact={(label, body) => appendGoalNote(expanded.id, `${label} · ${focusNode.title}`, body)}
        />
      )}

      {goalDone && (
        <div className="fixed inset-0 z-[135] grid place-items-center bg-canvas/80 px-6 backdrop-blur-sm" onClick={() => setGoalDone(null)} role="dialog" aria-modal="true" aria-label="Goal complete">
          <div className="chrome animate-sheet-up flex flex-col items-center rounded-3xl px-10 py-8 text-center" onClick={(e) => e.stopPropagation()}>
            <Celebration hex={goalDone.hex} size={84} />
            <h2 className="mt-5 font-display text-2xl font-semibold text-ink">{goalDone.title}</h2>
            <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-muted">{goalDone.sub}</p>
            <button onClick={() => setGoalDone(null)} className="raised-gold mt-6 inline-flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-[14px] font-medium">Continue</button>
          </div>
        </div>
      )}

      {ctx && (
        <div
          role="menu"
          className="chrome animate-fade-in fixed z-[150] w-52 overflow-hidden rounded-xl p-1.5"
          style={{ left: Math.min(ctx.x, window.innerWidth - 220), top: Math.min(ctx.y, window.innerHeight - 220) }}
        >
          <div className="truncate px-3 pb-1 pt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            {ctx.node ? truncate(ctx.node.title, 22) : "Goal"}
          </div>
          {(ctx.node
            ? [
                { label: "Focus", onClick: () => openFocus(ctx.node!) },
                { label: ctx.node.status === "done" ? "Mark not done" : "Mark done", onClick: () => setStatus(ctx.goalId, ctx.node!.id, ctx.node!.status === "done" ? "not_started" : "done") },
                { label: "Add a branch here", onClick: () => setBranchFor(ctx.node!.id) },
                { label: "Delete step", danger: true, onClick: () => removeNode(ctx.goalId, ctx.node!.id) },
              ]
            : [
                { label: groupOf(ctx.goalId) ? "Move to a group" : "Add to a group", onClick: () => { setGroupPickerFor(ctx.goalId); setNewGroupName(""); } },
                { label: "Change colour", onClick: () => cycleColor(ctx.goalId) },
                { label: "Adapt with Sola", onClick: () => void runReplan(ctx.goalId) },
                { label: "Share", onClick: () => void shareGoalLink(ctx.goalId) },
                { label: "Delete goal", danger: true, onClick: () => removeGoal(ctx.goalId) },
              ]
          ).map((it) => (
            <button
              key={it.label}
              onClick={() => { it.onClick(); setCtx(null); }}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                it.danger ? "text-warn hover:bg-warn/10" : "text-muted hover:bg-white/5 hover:text-ink"
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}

      {groupPickerFor && (() => {
        const goalId = groupPickerFor;
        const g = goals.find((x) => x.id === goalId);
        const current = groupOf(goalId);
        return (
          <div className="fixed inset-0 z-[150] grid place-items-center bg-canvas/70 px-6 backdrop-blur-sm" onClick={() => setGroupPickerFor(null)} role="dialog" aria-modal="true" aria-label="Add to a group">
            <div className="chrome animate-sheet-up w-72 rounded-2xl p-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 px-2.5 pb-1 pt-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Groups · {truncate(g?.title ?? "Goal", 18)}</span>
                <button onClick={() => setGroupPickerFor(null)} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Close"><X size={13} /></button>
              </div>
              {groups.length > 0 && (
                <div className="max-h-48 overflow-y-auto py-0.5">
                  {groups.map((gr) => {
                    const inIt = gr.goalIds.includes(goalId);
                    return (
                      <button key={gr.id} onClick={() => fileGoal(gr.id, goalId)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-muted transition-colors hover:bg-white/5 hover:text-ink">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: GOAL_PALETTE[gr.colorIdx % GOAL_PALETTE.length].hex }} />
                        <span className="min-w-0 flex-1 truncate">{gr.label}</span>
                        {inIt && <Check size={14} className="shrink-0 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); createConstellation(newGroupName, goalId); }} className={cn("flex items-center gap-1.5 px-1.5 pt-2", groups.length > 0 && "mt-0.5 border-t border-line")}>
                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="New group…" className="h-8 min-w-0 flex-1 bg-transparent px-1.5 text-[13px] text-ink placeholder:text-faint focus:outline-none" autoFocus />
                <button type="submit" disabled={!newGroupName.trim()} className="raised-btn inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] text-accent disabled:opacity-40"><Plus size={13} /> Create</button>
              </form>
              {current && (
                <button onClick={() => fileGoal(current.id, goalId)} className="mt-1 flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[12px] text-faint transition-colors hover:text-warn">
                  Remove from {truncate(current.label, 18)}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ghost goal-orb that follows the cursor while dragging "New goal" out */}
      {toolDrag && Math.hypot(toolDrag.sx - toolDrag.ox, toolDrag.sy - toolDrag.oy) > 6 && (
        <div className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-1/2" style={{ left: toolDrag.sx, top: toolDrag.sy }}>
          <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: light ? "radial-gradient(circle at 34% 26%, #ffffff 0%, #e6b877 52%, var(--orb-core-deep) 100%)" : "radial-gradient(circle at 34% 26%, #fdf3e0 0%, #e6b877 46%, #1a130a 100%)", boxShadow: light ? "0 6px 16px -4px rgba(120,84,30,0.4)" : "0 0 30px rgba(230,184,119,0.5)" }}>
            <Plus size={18} className="text-[#241809]" />
          </span>
        </div>
      )}

      <UpgradeModal reason={upgradeReason} onClose={() => setUpgradeReason(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function hashN(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** A faint, seeded "surface" — a tilted band + soft spots — so each planet looks distinct. */
function PlanetSurface({ hex, seed }: { hex: string; seed: string }) {
  const h = hashN(seed);
  const bandRot = h % 360;
  const bandTop = 22 + (h % 46);
  const sX = 12 + ((h >> 4) % 60);
  const sY = 44 + ((h >> 7) % 40);
  const s2X = 10 + ((h >> 9) % 55);
  const s2Y = 10 + ((h >> 11) % 38);
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden>
      <span className="absolute -left-1/4 -right-1/4 h-[24%]" style={{ top: `${bandTop}%`, transform: `rotate(${bandRot}deg)`, background: `linear-gradient(90deg, transparent, ${hex}38, transparent)` }} />
      <span className="absolute rounded-full blur-md" style={{ width: "52%", height: "52%", left: `${sX}%`, top: `${sY}%`, background: `radial-gradient(circle, ${hex}45, transparent 70%)` }} />
      <span className="absolute rounded-full blur-[5px]" style={{ width: "22%", height: "22%", left: `${s2X}%`, top: `${s2Y}%`, background: "radial-gradient(circle, rgba(255,255,255,0.20), transparent 70%)" }} />
    </span>
  );
}

function GoalCluster({
  goal, light, pos, hex, expanded, dimmed, focusLens, hovered, selectedNodeId, poppedId,
  onPlanetDown, onPlanetUp, onEnter, onLeave, onSelectNode, onNodeContext, onCoreContext,
}: {
  goal: GoalWithNodes;
  light: boolean;
  pos: { x: number; y: number };
  hex: string;
  expanded: boolean;
  dimmed: boolean;
  focusLens: boolean;
  hovered: boolean;
  selectedNodeId: string | null;
  poppedId: string | null;
  onPlanetDown: (e: React.PointerEvent) => void;
  onPlanetUp: (e: React.PointerEvent) => void;
  onEnter: () => void;
  onLeave: () => void;
  onSelectNode: (id: string) => void;
  onNodeContext: (node: GoalNode, e: React.MouseEvent) => void;
  onCoreContext: (e: React.MouseEvent) => void;
}) {
  // Trees open outward, away from the crowded galaxy centre (goals near the
  // centre keep opening upward). Snap toward the nearest of 8 directions so the
  // spine stays legible rather than at an arbitrary angle.
  const baseDir = React.useMemo(() => {
    const d = Math.hypot(pos.x, pos.y);
    // Point the tree smoothly straight away from the centre — no snapping to fixed directions.
    if (d < 60) return -Math.PI / 2;
    return Math.atan2(pos.y, pos.x);
  }, [pos.x, pos.y]);
  const placed = React.useMemo(() => (expanded ? layoutTree(goal.nodes, baseDir) : []), [expanded, goal.nodes, baseDir]);
  const maxDist = React.useMemo(() => Math.max(1, ...placed.map((p) => Math.hypot(p.x, p.y))), [placed]);
  const nId = nextId(goal.nodes);
  // Core "charge" ring — fills and brightens with overall goal progress.
  const corePct = Math.max(0, Math.min(100, goal.progress || 0)) / 100;
  const coreRingR = (expanded ? 92 : 80) / 2 + 6;
  const coreRingBox = coreRingR * 2 + 6;
  const coreRingC = 2 * Math.PI * coreRingR;

  return (
    <div className="absolute" style={{ left: pos.x, top: pos.y, opacity: dimmed ? 0.32 : 1, transition: "opacity 0.4s ease" }}>
      {/* branches */}
      {expanded && (
        <svg width={1} height={1} className="absolute" style={{ left: 0, top: 0, overflow: "visible" }} aria-hidden>
          {placed.map((p) => {
            const isNext = p.node.id === nId;
            // End the connectors right at each orb's edge (nodes are now centred
            // exactly on their position, so lines meet the rings cleanly).
            const CORE_R = p.px === 0 && p.py === 0 ? 44 : 22;
            const NODE_R = p.spine ? 23 : 17;
            const dx = p.x - p.px;
            const dy = p.y - p.py;
            const d = Math.hypot(dx, dy) || 1;
            const sx = p.px + (dx / d) * CORE_R;
            const sy = p.py + (dy / d) * CORE_R;
            const ex = p.x - (dx / d) * NODE_R;
            const ey = p.y - (dy / d) * NODE_R;
            const mx = (sx + ex) / 2 + dy * 0.08;
            const my = (sy + ey) / 2 - dx * 0.08;
            // build animation: branches sweep out from the core, staggered by depth
            const len = Math.hypot(ex - sx, ey - sy) * 1.15 + 4;
            const delay = (Math.hypot(p.x, p.y) / maxDist) * 0.5;
            // A lit trail: edges into finished steps glow like a path you've walked;
            // the edge into your next step flows; still-to-come edges stay dim.
            const lit = p.node.status === "done";
            return (
              <path
                key={p.node.id}
                d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`}
                fill="none"
                stroke={hex}
                strokeWidth={isNext ? 2 : lit ? (p.spine ? 2 : 1.5) : p.spine ? 1.5 : 1.0}
                strokeLinecap="round"
                strokeDasharray={isNext ? "3 7" : undefined}
                className={isNext ? "animate-flow" : undefined}
                style={
                  isNext
                    ? ((light ? {} : { filter: `drop-shadow(0 0 3px ${hex})` }) as React.CSSProperties)
                    : ({ strokeDasharray: len, animation: `draw-in 0.5s ease ${delay.toFixed(2)}s both`, "--len": String(len), ...(lit && !light ? { filter: `drop-shadow(0 0 3px ${hex}aa)` } : null) } as React.CSSProperties)
                }
                opacity={isNext ? (light ? 1 : 0.95) : lit ? (light ? 0.9 : 0.95) : p.node.status === "not_started" ? (light ? 0.5 : 0.28) : (light ? 0.72 : 0.6)}
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
            light={light}
            x={p.x}
            y={p.y}
            hex={hex}
            isNext={p.node.id === nId}
            selected={p.node.id === selectedNodeId}
            popping={p.node.id === poppedId}
            spine={p.spine}
            faded={focusLens && p.node.id !== nId && p.node.status !== "in_motion" && p.node.status !== "at_risk"}
            delay={(Math.hypot(p.x, p.y) / maxDist) * 0.5 + 0.14}
            onSelect={() => onSelectNode(p.node.id)}
            onContext={(e) => onNodeContext(p.node, e)}
          />
        ))}

      {/* core planet */}
      <button
        onPointerDown={onPlanetDown}
        onPointerUp={onPlanetUp}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={onCoreContext}
        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-none"
        style={{ left: 0, top: 0 }}
        aria-label={goal.title}
      >
        {/* Core halo. Painted as a radial-gradient, NOT filter:blur — the galaxy
            layer sets will-change:transform, and Chrome clips a blurred child to
            its layer bounds on repaint, which flashed a hard box around the orb. */}
        <span className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: light ? `radial-gradient(circle, ${hex}1c, ${hex}0e 40%, transparent 70%)` : `radial-gradient(circle, ${hex}4a, ${hex}22 40%, transparent 70%)` }} />
        {/* charge ring — fills and glows brighter as the goal nears the finish */}
        <svg width={coreRingBox} height={coreRingBox} className="pointer-events-none absolute left-1/2 top-1/2" style={{ transform: "translate(-50%, -50%) rotate(-90deg)" }} aria-hidden>
          <circle cx={coreRingBox / 2} cy={coreRingBox / 2} r={coreRingR} fill="none" stroke="var(--orb-ring-track)" strokeWidth={3} />
          <circle cx={coreRingBox / 2} cy={coreRingBox / 2} r={coreRingR} fill="none" stroke={hex} strokeWidth={3} strokeLinecap="round" strokeDasharray={coreRingC} strokeDashoffset={coreRingC * (1 - corePct)} style={{ transition: "stroke-dashoffset 0.6s ease", filter: light ? "drop-shadow(0 1px 1px rgba(20,22,30,0.2))" : `drop-shadow(0 0 ${3 + corePct * 7}px ${hex})` }} />
        </svg>
        <span
          className={cn("relative grid animate-grow-in place-items-center overflow-hidden rounded-full transition-transform", expanded ? "h-[92px] w-[92px]" : "h-20 w-20")}
          style={{
            background: light
              ? `radial-gradient(circle at 34% 26%, #ffffff 0%, color-mix(in srgb, ${hex} 82%, #fff) 26%, ${hex} 60%, color-mix(in srgb, ${hex} 60%, #2a2f3a) 100%)`
              : `radial-gradient(circle at 34% 26%, #fdf3e0 0%, ${hex} 46%, #1a130a 100%)`,
            boxShadow: light
              ? `inset 0 2px 6px rgba(255,255,255,0.6), inset 0 -8px 16px color-mix(in srgb, ${hex} 35%, transparent), 0 12px 26px -8px rgba(20,22,30,0.32)`
              : `inset 0 -8px 22px rgba(0,0,0,0.5), inset 0 3px 9px rgba(255,255,255,0.35)`,
          }}
        >
          <PlanetSurface hex={hex} seed={goal.id} />
          {/* the goal's icon, embossed into the planet's shine */}
          {React.createElement(goalIcon(goal.icon), {
            size: expanded ? 50 : 42,
            strokeWidth: 1.5,
            className: "relative",
            style: { color: "#ffffff", opacity: light ? 0.6 : 0.72, filter: "drop-shadow(0 1px 2px rgba(50,34,8,0.4))" },
          })}
        </span>

        {/* beneath the planet: percentage (significant, always shown) + name */}
        <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-center">
          <span className="block text-[19px] font-bold leading-none text-ink" style={{ textShadow: "var(--map-label-shadow)" }}>
            {Math.round(goal.progress)}%
          </span>
          <span
            className={cn(
              "mt-1 block transition-opacity duration-200",
              expanded || hovered ? "opacity-100" : "opacity-100 [@media(hover:hover)]:opacity-0"
            )}
          >
            <span className="mx-auto block max-w-[170px] truncate text-[13px] font-semibold text-ink" style={{ textShadow: "var(--map-label-shadow)" }}>
              {truncate(goal.title, 30)}
            </span>
            <span className="mt-0.5 block font-mono text-[10px] text-faint" style={{ textShadow: "var(--map-label-shadow)" }}>
              {goal.nodes.length} step{goal.nodes.length === 1 ? "" : "s"}
              {goal.targetDate ? ` · due ${relativeDays(goal.targetDate)}` : ""}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

function NodeOrb({
  node, light, x, y, hex, isNext, selected, popping, spine, faded, delay, onSelect, onContext,
}: {
  node: GoalNode;
  light: boolean;
  x: number;
  y: number;
  hex: string;
  isNext: boolean;
  selected: boolean;
  popping: boolean;
  spine: boolean;
  faded: boolean;
  delay: number;
  onSelect: () => void;
  onContext: (e: React.MouseEvent) => void;
}) {
  const done = node.status === "done";
  const dim = node.status === "not_started";
  const size = spine ? 50 : 38;
  // A charging ring hugs steps that are underway, filled to their progress.
  const pct = Math.max(0, Math.min(100, node.progress || 0)) / 100;
  const showRing = !done && !dim;
  const ringR = size / 2 + 3;
  const ringBox = ringR * 2 + 4;
  const ringC = 2 * Math.PI * ringR;
  // Dark: colored glows lift the orb off the starfield. Light: glows read as
  // nothing, so state is carried by color + a soft neutral drop shadow instead.
  const glow = light
    ? done
      ? `inset 0 1px 3px rgba(255,255,255,0.5), 0 4px 12px -4px color-mix(in srgb, ${hex} 55%, rgba(20,22,30,0.5))`
      : dim
        ? `inset 0 1px 3px rgba(255,255,255,0.5), 0 2px 6px -3px rgba(20,22,30,0.22)`
        : isNext
          ? `inset 0 1px 3px rgba(255,255,255,0.55), 0 5px 14px -4px color-mix(in srgb, ${hex} 45%, rgba(20,22,30,0.4))`
          : `inset 0 1px 3px rgba(255,255,255,0.5), 0 3px 10px -4px rgba(20,22,30,0.28)`
    : done
      ? `0 0 24px ${hex}88, inset 0 0 12px ${hex}55`
      : dim
        ? `0 0 10px ${hex}30`
        : isNext
          ? `0 0 26px ${hex}80`
          : `0 0 16px ${hex}4d`;
  const bg = light
    ? done
      ? `radial-gradient(circle at 38% 30%, #ffffff 0%, ${hex} 55%, color-mix(in srgb, ${hex} 62%, #3a4038) 100%)`
      : `radial-gradient(circle at 40% 34%, color-mix(in srgb, ${hex} 78%, #fff) 0%, ${hex} 55%, color-mix(in srgb, ${hex} 62%, #2a2f3a) 100%)`
    : done
      ? `radial-gradient(circle at 38% 30%, #f6faf5 0%, ${hex} 55%, #14231a 100%)`
      : `radial-gradient(circle at 40% 34%, ${hex}33, rgba(12,14,18,0.94) 72%)`;
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 animate-grow-in" style={{ left: x, top: y, animationDelay: `${delay.toFixed(2)}s`, opacity: faded ? 0.22 : 1, transition: "opacity 0.35s ease" }}>
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerDown={(e) => e.stopPropagation()}
        onContextMenu={onContext}
        className="relative grid place-items-center"
        style={{ width: size, height: size, animation: "breathe 6s ease-in-out infinite" }}
      >
        {showRing && (
          <svg width={ringBox} height={ringBox} className="pointer-events-none absolute left-1/2 top-1/2" style={{ transform: "translate(-50%, -50%) rotate(-90deg)" }} aria-hidden>
            <circle cx={ringBox / 2} cy={ringBox / 2} r={ringR} fill="none" stroke="var(--orb-ring-track)" strokeWidth={2.5} />
            <circle cx={ringBox / 2} cy={ringBox / 2} r={ringR} fill="none" stroke={hex} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringC * (1 - pct)} style={{ transition: "stroke-dashoffset .5s ease", filter: light ? "none" : `drop-shadow(0 0 3px ${hex}88)` }} />
          </svg>
        )}
        {/* you-are-here beacon: a calm "Next" tag + a static ring — no pulsing. */}
        {isNext && (
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ background: light ? `${hex}2e` : `${hex}26`, color: light ? `color-mix(in srgb, ${hex} 72%, #2a2f3a)` : hex, textShadow: "var(--map-label-shadow)" }}>
            Next
          </span>
        )}
        {(isNext || selected) && (
          <span className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 3px ${light ? `${hex}66` : `${hex}44`}`, margin: -4 }} />
        )}
        {popping && <span className="absolute inset-0 animate-burst rounded-full" style={{ border: `2px solid ${hex}` }} />}
        <span
          className={cn("grid place-items-center rounded-full border", popping && "animate-pop")}
          style={{ width: size, height: size, borderColor: dim ? (light ? `color-mix(in srgb, ${hex} 70%, #2a2f3a)` : `${hex}88`) : hex, background: bg, boxShadow: glow, opacity: dim ? 0.92 : 1, transition: "background .4s ease, box-shadow .4s ease" }}
        >
          {done ? (
            <Check size={spine ? 18 : 15} className="text-[#0d1a14]" strokeWidth={2.5} />
          ) : (
            <span className="rounded-full" style={{ width: spine ? 9 : 7, height: spine ? 9 : 7, background: hex, boxShadow: light ? "none" : `0 0 8px ${hex}` }} />
          )}
        </span>
        {/* Label floats below the orb (absolute) so the ORB stays centred on the node
            position — otherwise the label pushes the orb off-centre and connectors miss. */}
        <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 max-w-[110px] -translate-x-1/2 text-center leading-tight">
          <span
            className={cn("block truncate text-[11px]", selected ? "font-semibold text-ink" : "text-ink/85")}
            style={{ textShadow: "var(--map-label-shadow)" }}
          >
            {node.title}
          </span>
        </span>
      </button>
    </div>
  );
}

/* ------------------------------ bottom bars ------------------------------ */

type Speech = ReturnType<typeof useSpeechInput>;

/** Full-screen gallery of proven starter goals — one tap adopts a whole plan. */
function TemplateGallery({ onPick, onClose }: { onPick: (t: GoalTemplate) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas/95 backdrop-blur-xl">
      <button
        onClick={onClose}
        className="fixed right-5 top-[calc(env(safe-area-inset-top)+16px)] z-10 grid h-10 w-10 place-items-center rounded-full text-faint transition-colors hover:text-ink"
        aria-label="Close templates"
      >
        <X size={18} />
      </button>
      <div className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">Starter goals</span>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Pick a proven path</h2>
          <p className="mt-1.5 text-[14px] text-muted">A full plan in one tap. Steps, resources, a finish line. Tweak anything after.</p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => {
            const Icon = goalIcon(t.icon);
            return (
              <button key={t.id} onClick={() => onPick(t)} className="panel rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "rgba(230,184,119,0.12)" }}>
                    <Icon size={19} className="text-accent" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[15px] font-semibold text-ink">{t.title}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-faint">{t.category} · {t.milestones.length} milestones · ~{t.targetWeeks}w</span>
                  </div>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{t.blurb}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent">
                  <Plus size={13} /> Add to my map
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NewGoalBar({
  value, onChange, onSubmit, speech, empty, onBrowse, onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  speech: Speech;
  empty: boolean;
  onBrowse: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="animate-sheet-up">
      {empty && (
        <p className="mb-3 text-center text-[15px] text-muted">
          <span className="font-display text-ink">What&apos;s the goal?</span>
          <br />
          Name a goal. Solaspace maps the whole path.
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
      <div className="mt-2.5 text-center">
        <button onClick={onBrowse} className="inline-flex items-center gap-1.5 text-[13px] text-faint transition-colors hover:text-ink">
          <LayoutGrid size={13} /> or start from a template
        </button>
      </div>
    </div>
  );
}

function GoalBar({
  goal, hex, value, onChange, onAddStep, onColor, onDelete, onAdapt, onShare, onGroup, onClose,
}: {
  goal: GoalWithNodes;
  hex: string;
  value: string;
  onChange: (v: string) => void;
  onAddStep: () => void;
  onColor: () => void;
  onDelete: () => void;
  onAdapt: () => void;
  onShare: () => void;
  onGroup: () => void;
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
            {goal.nodes.length > 0 && (
              <button onClick={onAdapt} className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:text-accent" aria-label="Adapt the plan" title="Adapt the plan to your progress"><Wand2 size={16} /></button>
            )}
            <button onClick={onGroup} className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Add to a group" title="Add to a group (Health, Work…)"><Boxes size={16} /></button>
            <button onClick={onShare} className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Share this map" title="Copy a public link"><Share2 size={16} /></button>
            <Link href={`/app/notebook?goal=${goal.id}`} className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Notebook" title="Notebook"><NotebookPen size={16} /></Link>
            <button onClick={onColor} className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Change color" title="Change color"><Palette size={16} /></button>
            <button onClick={() => setArmed(true)} className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:text-warn" aria-label="Delete goal" title="Delete goal"><Trash2 size={16} /></button>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Close" title="Close"><X size={16} /></button>
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

const REPLAN_META: Record<ReplanKind, string> = {
  onramp: "Easier on-ramp",
  substep: "Next step",
  milestone: "New phase",
  stretch: "Stretch",
};

/** The living map's review sheet: accept or dismiss Solaspace's proposed changes. */
function ReplanSheet({ hex, loading, proposals, onAccept, onDismiss, onClose }: {
  hex: string;
  loading: boolean;
  proposals: (ReplanProposal & { pid: string })[];
  onAccept: (p: ReplanProposal & { pid: string }) => void;
  onDismiss: (pid: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="chrome animate-sheet-up rounded-2xl p-3">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        {loading ? <Loader2 size={14} className="animate-spin text-accent" /> : <Wand2 size={14} className="text-accent" />}
        <span className="flex-1 text-[13px] font-medium text-ink">Adapt the plan</span>
        <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Close"><X size={15} /></button>
      </div>

      {loading ? (
        <div className="space-y-2 px-1 pb-1">
          {[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />)}
          <p className="pt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Reading where you are…</p>
        </div>
      ) : proposals.length === 0 ? (
        <p className="px-1 pb-1.5 text-[13px] text-muted">Your plan looks solid. Nothing to change right now.</p>
      ) : (
        <div className="space-y-2">
          {proposals.map((p) => (
            <div key={p.pid} className="inset-well rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ background: `${hex}22`, color: hex }}>{REPLAN_META[p.kind]}</span>
                {p.parentTitle && <span className="min-w-0 truncate text-[11px] text-faint">under &ldquo;{truncate(p.parentTitle, 22)}&rdquo;</span>}
              </div>
              <p className="mt-1.5 text-[14px] font-medium leading-snug text-ink">{p.title}</p>
              {p.reason && <p className="mt-0.5 text-[12px] text-muted">{p.reason}</p>}
              <div className="mt-2.5 flex items-center gap-2">
                <button onClick={() => onAccept(p)} className="raised-gold inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium"><ArrowDownToLine size={13} /> Add to map</button>
                <button onClick={() => onDismiss(p.pid)} className="raised-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-muted hover:text-ink">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
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

function PreGenClarifier({ clarifiers, loading, onCreate, onCancel }: { clarifiers: Clarifier[]; loading: boolean; onCreate: (answers: Record<string, string>, extra: string) => void; onCancel: () => void }) {
  // Answers are staged locally and folded into the SINGLE goal-map call. Skip =
  // just hit "Create plan" without answering.
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [showMore, setShowMore] = React.useState(false);
  const [extra, setExtra] = React.useState("");
  const pick = (q: string, o: string) => setAnswers((a) => ({ ...a, [q]: a[q] === o ? "" : o }));

  return (
    <div className="chrome mb-2 animate-sheet-up rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-2">
        {loading ? <Loader2 size={13} className="animate-spin text-accent" /> : <Sparkles size={13} className="text-accent" />}
        <span className="flex-1 text-[12px] text-muted">{loading ? "Thinking of a couple questions…" : <>A couple quick things <span className="text-faint">· optional</span></>}</span>
        <button onClick={onCancel} className="grid h-6 w-6 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Cancel"><X size={13} /></button>
      </div>

      {loading ? (
        <div className="space-y-2 py-1">
          {[0, 1].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.04]" />)}
          <div className="pt-1 text-right">
            <button onClick={() => onCreate({}, "")} className="raised-btn rounded-lg px-3.5 py-1.5 text-[13px] text-muted hover:text-ink">Skip questions</button>
          </div>
        </div>
      ) : (
      <>
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

        {/* Tell me more — free-text context (a future Pro capability). */}
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
        <button onClick={() => onCreate({}, "")} className="raised-btn rounded-lg px-3.5 py-1.5 text-[13px] text-muted hover:text-ink">Skip</button>
        <button onClick={() => onCreate(answers, extra)} className="raised-gold inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px]">
          <Sparkles size={13} /> Create plan
        </button>
      </div>
      </>
      )}
    </div>
  );
}

/**
 * A step's resource. For video steps it resolves the query to a REAL YouTube
 * result on open (once, then cached on the node) and shows a titled card. If
 * there's no key or no result — or for "read" steps — it falls back to today's
 * live search link, so the link is never dead and never hallucinated.
 */
export function NodeResourceBlock({ node, onResolve }: { node: GoalNode; onResolve: (r: ResolvedResource) => void }) {
  const resource = node.resource!;
  const resMeta = RESOURCE_META[resource.kind];
  const [resolved, setResolved] = React.useState<ResolvedResource | null>(resource.resolved ?? null);
  // Starts true when we'll resolve on open (any kind not yet resolved to a real URL).
  const [resolving, setResolving] = React.useState(() => !resource.resolved);

  React.useEffect(() => {
    if (resolved) return;
    let alive = true;
    viaRoute<{ resolved: ResolvedResource | null }>("/api/resource/resolve", { kind: resource.kind, query: resource.query })
      .then((j) => {
        if (!alive) return;
        if (j?.resolved) { setResolved(j.resolved); onResolve(j.resolved); }
        setResolving(false);
      })
      .catch(() => { if (alive) setResolving(false); });
    return () => { alive = false; };
    // Resolve once per node open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (resolved) {
    return (
      <a href={resolved.url} target="_blank" rel="noopener noreferrer" className="raised-btn mt-3 flex items-center gap-3 rounded-xl p-2 pr-3.5">
        {resolved.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolved.thumbnail} alt="" className="h-12 w-[84px] shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="grid h-12 w-[84px] shrink-0 place-items-center rounded-lg bg-white/5"><resMeta.Icon size={18} className="text-accent" /></span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">{resolved.title}</span>
          <span className="block truncate text-[11px] text-faint">{resMeta.verb} · {resolved.source}</span>
        </span>
        <ExternalLink size={14} className="shrink-0 text-faint" />
      </a>
    );
  }

  return (
    <a href={resourceUrl(resource)} target="_blank" rel="noopener noreferrer" className="raised-btn mt-3 flex items-center gap-3 rounded-xl px-3.5 py-2.5">
      {resolving ? <Loader2 size={18} className="shrink-0 animate-spin text-accent" /> : <resMeta.Icon size={18} className="shrink-0 text-accent" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{resMeta.verb}: {resource.label}</span>
        <span className="block text-[11px] text-faint">{resolving ? "Finding the best link…" : "Opens a search."}</span>
      </span>
      <ExternalLink size={14} className="shrink-0 text-faint" />
    </a>
  );
}

function NodeSheet({
  node, hex, goalTitle, goalNotes, breaking, isPro, onToast, onClose, onDone, onFocus, onDelete, onBranch, onBreakDown, onMakeSmaller, onResolveResource, onSaveArtifact,
}: {
  node: GoalNode;
  hex: string;
  goalTitle: string;
  goalNotes: string;
  breaking: boolean;
  isPro: boolean;
  onToast: (m: string) => void;
  onClose: () => void;
  onDone: () => void;
  onFocus: () => void;
  onDelete: () => void;
  onBranch: () => void;
  onBreakDown: () => void;
  onMakeSmaller: () => void;
  onResolveResource: (nodeId: string, resolved: ResolvedResource) => void;
  onSaveArtifact: (label: string, body: string) => void;
}) {
  const [asking, setAsking] = React.useState(false);
  const [armedDel, setArmedDel] = React.useState(false);
  const [breakOpen, setBreakOpen] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [drafting, setDrafting] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftResult | null>(null);
  const [draftBody, setDraftBody] = React.useState("");
  const [draftLoading, setDraftLoading] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [editingDraft, setEditingDraft] = React.useState(false);
  const [researching, setResearching] = React.useState(false);
  const [researchResult, setResearchResult] = React.useState<ResearchResult | null>(null);
  const [researchLoading, setResearchLoading] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [congrats, setCongrats] = React.useState<{ title: string; sub: string } | null>(null);

  const router = useRouter();
  // Blocking AI responses (upgrade / rate-limit / sign-in) surface as a toast —
  // and Pro-gated ones redirect to billing — instead of rendering inline.
  const handleAiError = (e: unknown): boolean => {
    if (e instanceof AiError) {
      onToast(e.message);
      if (e.upgrade) router.push("/app/billing");
      return true;
    }
    return false;
  };

  const markDone = () => {
    onDone();            // mark the step done (optimistic) — the sheet stays open…
    router.refresh();    // …reload so the map updates…
    const { title, sub } = pickCelebration(node.id, null);
    setCongrats({ title, sub }); // …and land on a quiet celebration
  };

  const runResearch = async () => {
    // Free users get a daily taste (metered server-side); when it's used up the
    // server returns an upgrade prompt, surfaced by handleAiError below.
    setResearching(true); setAsking(false); setBreakOpen(false); setDrafting(false);
    if (researchResult || researchLoading) return;
    setResearchLoading(true);
    try {
      const r = await research({ goalTitle, nodeTitle: node.title, context: goalNotes.trim() || undefined });
      setResearchResult(r);
    } catch (e) {
      if (!handleAiError(e)) onToast("Couldn't complete research. Try again.");
      setResearching(false);
    } finally {
      setResearchLoading(false);
    }
  };

  const runDraft = async () => {
    setDrafting(true); setAsking(false); setBreakOpen(false); setEditingDraft(false);
    if (draft || draftLoading) return;
    setDraftLoading(true); setSaved(false);
    try {
      const d = await draftForStep({ goalTitle, nodeTitle: node.title, nodeDescription: node.description, context: goalNotes.trim() || undefined });
      setDraft(d); setDraftBody(d.content);
    } catch (e) {
      if (!handleAiError(e)) onToast("Couldn't draft that. Try again.");
      setDrafting(false);
    } finally {
      setDraftLoading(false);
    }
  };

  const runStuck = async () => {
    if (loading) return;
    setLoading(true);
    setAnswer(null);
    try {
      const r = await unblock({ goalTitle, nodeTitle: node.title, context: goalNotes.trim() || undefined });
      setAnswer(r.answer);
    } catch (e) {
      if (!handleAiError(e)) onToast("Couldn't get help. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await askNode({ goalTitle, nodeTitle: node.title, question: q, context: goalNotes.trim() || undefined });
      setAnswer(res.answer);
    } catch (e) {
      if (!handleAiError(e)) onToast("Couldn't answer that. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // A step just got completed — hold the sheet on a quiet celebration before it
  // closes. This is the reward moment; the proof (if any) is private to the user.
  if (congrats) {
    return (
      <div className="chrome animate-sheet-up rounded-2xl p-6 text-center">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 35%, ${hex}33, transparent 72%)`,
            boxShadow: `0 0 0 2px rgba(255,240,210,0.85), 0 0 26px ${hex}aa`,
          }}
        >
          <Check size={26} className="text-ink" />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold text-ink">{congrats.title}</h2>
        <p className="mx-auto mt-1.5 max-w-[16rem] text-[13px] leading-relaxed text-muted">{congrats.sub}</p>
        <button onClick={onClose} className="raised-gold mx-auto mt-5 inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-[13px] font-medium">
          Continue
        </button>
      </div>
    );
  }

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
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setArmedDel(true)} className="grid h-9 w-9 place-items-center rounded-lg text-faint transition-colors hover:text-warn" aria-label="Delete this step" title="Delete this step"><Trash2 size={16} /></button>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Close"><X size={17} /></button>
        </div>
      </div>
      {armedDel && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-warn/25 bg-warn/[0.06] px-3 py-2">
          <span className="min-w-0 flex-1 text-[13px] text-warn">Delete this step?</span>
          <Chip onClick={() => setArmedDel(false)}>Cancel</Chip>
          <Chip tone="warn" icon={<Trash2 size={13} />} onClick={onDelete}>Delete</Chip>
        </div>
      )}
      {node.description && <div className="mt-1.5 text-[13px] leading-relaxed text-muted"><Markdown>{node.description}</Markdown></div>}

      {node.resource && (
        <NodeResourceBlock node={node} onResolve={(r) => onResolveResource(node.id, r)} />
      )}

      {/* Lead with the two verbs that matter; the four AI helpers live behind one
          reveal so the sheet reads as a calm command surface, not a 6-button toolbar. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip tone="accent" icon={<Timer size={14} />} onClick={onFocus}>Focus</Chip>
        <Chip tone="sage" icon={<Check size={14} />} onClick={markDone}>Done</Chip>
        <Chip tone="accent" active={helpOpen} icon={<Sparkles size={14} />} onClick={() => setHelpOpen((o) => !o)}>
          Sola can help <ChevronDown size={13} className={cn("transition-transform", helpOpen && "rotate-180")} />
        </Chip>
      </div>
      {helpOpen && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-l border-line pl-3 animate-sheet-up">
          <Chip tone="accent" icon={<MessageCircle size={14} />} onClick={() => { setAsking((a) => !a); setBreakOpen(false); }}>Ask Sola</Chip>
          <Chip tone="accent" icon={breaking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} onClick={breaking ? undefined : () => { setBreakOpen((o) => !o); setAsking(false); }}>
            {breaking ? "Working…" : "Break it down"}
          </Chip>
          <Chip tone="accent" icon={<Scissors size={14} />} onClick={breaking ? undefined : onMakeSmaller}>Make it smaller</Chip>
          <Chip tone="accent" icon={<Wand2 size={14} />} onClick={() => void runDraft()}>Do it for me</Chip>
          <Chip tone="accent" pro={!isPro} icon={<Search size={14} />} onClick={() => void runResearch()}>Research</Chip>
        </div>
      )}


      {researching && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Researched · sourced</span>
            <div className="flex items-center gap-2">
              {!researchLoading && researchResult && <button onClick={() => { setResearchResult(null); void runResearch(); }} className="text-[12px] text-faint transition-colors hover:text-muted">Redo</button>}
              <button onClick={() => setResearching(false)} className="text-faint transition-colors hover:text-ink" aria-label="Close research"><X size={14} /></button>
            </div>
          </div>
          {researchLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-white/5" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-white/5" />
              <p className="pt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Searching the web…</p>
            </div>
          ) : researchResult ? (
            <>
              <div className="mt-2 max-h-[42vh] overflow-y-auto overscroll-contain rounded-xl bg-white/[0.03] p-3 text-[13px] leading-relaxed text-ink"><Markdown>{researchResult.answer}</Markdown></div>
              {researchResult.sources.length > 0 && (
                <div className="mt-2.5">
                  <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Sources</div>
                  <div className="flex max-h-[22vh] flex-col gap-1 overflow-y-auto overscroll-contain">
                    {researchResult.sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="truncate text-[12px] text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent">
                        {i + 1}. {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {drafting && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">{draft?.title ?? "Sola is on it"}</span>
            <div className="flex items-center gap-2">
              {!draftLoading && draft && <button onClick={() => { setDraft(null); void runDraft(); }} className="text-[12px] text-faint transition-colors hover:text-muted">Redo</button>}
              <button onClick={() => setDrafting(false)} className="text-faint transition-colors hover:text-ink" aria-label="Close draft"><X size={14} /></button>
            </div>
          </div>
          {draftLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-white/5" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
              <p className="pt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Sola is drafting…</p>
            </div>
          ) : (
            <>
              <div className="mt-1.5 flex justify-end">
                <button onClick={() => setEditingDraft((e) => !e)} className="text-[11px] text-faint transition-colors hover:text-muted">
                  {editingDraft ? "Preview" : "Edit"}
                </button>
              </div>
              {editingDraft ? (
                <textarea
                  autoFocus
                  value={draftBody}
                  onChange={(e) => { setDraftBody(e.target.value); setSaved(false); }}
                  className="mt-1 min-h-[160px] w-full resize-none rounded-xl border border-transparent bg-white/[0.03] p-3 text-[13px] leading-relaxed text-ink transition-colors focus:border-accent/40 focus:outline-none focus-visible:shadow-none"
                />
              ) : (
                <div className="mt-1 max-h-[280px] overflow-y-auto rounded-xl bg-white/[0.03] p-3 text-[13px] leading-relaxed text-ink">
                  <Markdown>{draftBody}</Markdown>
                </div>
              )}
              <button onClick={() => { if (draft) { onSaveArtifact(draft.title, draftBody); setSaved(true); } }} disabled={saved || !draftBody.trim()} className="raised-gold mt-2 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium disabled:opacity-40">
                {saved ? <><Check size={14} /> Saved to notebook</> : <><Save size={14} /> Save to notebook</>}
              </button>
            </>
          )}
        </div>
      )}

      {breakOpen && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          <button onClick={() => { setBreakOpen(false); onBreakDown(); }} className="raised-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-accent transition-colors hover:text-ink">
            <Sparkles size={14} /> Let Sola split it
          </button>
          <button onClick={() => { setBreakOpen(false); onBranch(); }} className="raised-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-ink">
            <GitBranch size={14} /> Add a step myself
          </button>
        </div>
      )}

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
          <button onClick={() => void runStuck()} disabled={loading} className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink disabled:opacity-40">
            <HelpCircle size={13} /> I&apos;m stuck — just tell me how to start
          </button>
          {answer && <div className="mt-2.5 text-[13px] leading-relaxed text-muted"><Markdown>{answer}</Markdown></div>}
        </div>
      )}
    </div>
  );
}
