"use client";

import * as React from "react";
import Link from "next/link";
import { Waypoints, NotebookPen } from "lucide-react";
import type { GoalWithNodes } from "@/types";
import { goalIcon } from "@/lib/kairo/goal-icon";
import { useGoalColors } from "@/lib/kairo/use-goal-colors";
import { setGoalNotes } from "@/lib/data/actions";
import { loadPersisted, savePersisted } from "@/lib/store/persist";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const NOTES_KEY = "kairo.notes.v1";

export function Notebook({ goals, remote, initialGoalId }: { goals: GoalWithNodes[]; remote: boolean; initialGoalId?: string }) {
  const color = useGoalColors();
  const [notesByGoal, setNotesByGoal] = React.useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const g of goals) base[g.id] = g.notes ?? "";
    return base;
  });
  const [selectedId, setSelectedId] = React.useState<string>(
    () => (initialGoalId && goals.some((g) => g.id === initialGoalId) ? initialGoalId : goals[0]?.id ?? "")
  );
  const [saved, setSaved] = React.useState(true);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (remote) return;
    const stored = loadPersisted<Record<string, string>>(NOTES_KEY);
    // SSR-safe: localStorage can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setNotesByGoal((n) => ({ ...n, ...stored }));
  }, [remote]);

  const persist = (goalId: string, text: string, all: Record<string, string>) => {
    if (remote) void setGoalNotes({ goalId, notes: text });
    else savePersisted(NOTES_KEY, all);
    setSaved(true);
  };

  const onChange = (goalId: string, text: string) => {
    setSaved(false);
    setNotesByGoal((prev) => {
      const next = { ...prev, [goalId]: text };
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => persist(goalId, text, next), 700);
      return next;
    });
  };

  const flush = (goalId: string, text: string) => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    persist(goalId, text, { ...notesByGoal, [goalId]: text });
  };

  if (goals.length === 0) {
    return (
      <EmptyState
        icon={<NotebookPen size={22} />}
        title="Nothing to note yet"
        description="Map a goal first — then jot context and thoughts for it here."
        action={<Link href="/app/map"><Button variant="primary" size="lg">Create a goal</Button></Link>}
      />
    );
  }

  const selected = goals.find((g) => g.id === selectedId) ?? goals[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {goals.map((g) => {
          const active = g.id === selected.id;
          return (
            <button
              key={g.id}
              onClick={() => setSelectedId(g.id)}
              className={cn("inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px]", active ? "raised-btn text-ink" : "text-muted hover:text-ink")}
            >
              {React.createElement(goalIcon(g.icon), { size: 15, style: { color: color(g.id) } })}
              <span className="max-w-[160px] truncate">{g.title}</span>
            </button>
          );
        })}
      </div>

      <div className="panel rounded-2xl p-1.5">
        <div className="flex items-center justify-between px-3.5 pt-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">{saved ? "Saved" : "Saving…"}</span>
          <Link href={`/app/map?goal=${selected.id}`} className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink">
            <Waypoints size={13} /> Open in map
          </Link>
        </div>
        <textarea
          key={selected.id}
          value={notesByGoal[selected.id] ?? ""}
          onChange={(e) => onChange(selected.id, e.target.value)}
          onBlur={(e) => flush(selected.id, e.target.value)}
          placeholder={`Notes, links, and context for "${selected.title}"…`}
          className="min-h-[320px] w-full resize-none bg-transparent px-3.5 py-3 text-[15px] leading-relaxed text-ink placeholder:text-faint focus:outline-none"
        />
      </div>

      <p className="px-1 text-[12px] text-faint">
        Aether reads these notes when you use &ldquo;Ask&rdquo; or &ldquo;Go deeper&rdquo; on this goal&apos;s steps — so it answers with your context. No extra AI calls.
      </p>
    </div>
  );
}
