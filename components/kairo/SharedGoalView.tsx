import { createElement } from "react";
import Link from "next/link";
import { Check, PlayCircle, Dumbbell, BookOpen, ExternalLink, ArrowRight } from "lucide-react";
import type { SharedGoal, SharedNode } from "@/lib/data/shared";
import { goalIcon } from "@/lib/kairo/goal-icon";
import type { ResourceKind } from "@/types";

const RES: Record<ResourceKind, { verb: string; Icon: typeof PlayCircle }> = {
  watch: { verb: "Watch", Icon: PlayCircle },
  practice: { verb: "Practice", Icon: Dumbbell },
  read: { verb: "Read", Icon: BookOpen },
};

function searchUrl(kind: ResourceKind, label: string): string {
  const q = encodeURIComponent(label);
  return kind === "read" ? `https://www.google.com/search?q=${q}` : `https://www.youtube.com/results?search_query=${q}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Public, read-only view of a shared goal map. No auth, no interactivity. */
export function SharedGoalView({ shared }: { shared: SharedGoal }) {
  const { goal, nodes } = shared;
  const milestones = nodes.filter((n) => !n.parentId);
  const childrenOf = (id: string) => nodes.filter((n) => n.parentId === id);

  return (
    <div className="min-h-dvh bg-canvas px-5 py-8 md:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-[15px] font-semibold tracking-tight text-ink">Solaspace</Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Shared plan</span>
        </div>

        {/* hero */}
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "rgba(230,184,119,0.12)" }}>
            {createElement(goalIcon(goal.icon), { size: 26, className: "text-accent" })}
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink md:text-3xl">{goal.title}</h1>
          {goal.description && <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-muted">{goal.description}</p>}
          <div className="mt-5 w-full max-w-xs">
            <div className="inset-well h-2 overflow-hidden rounded-full">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, Math.round(goal.progress))}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-faint">
              <span>{Math.round(goal.progress)}% complete</span>
              {goal.targetDate && <span>Aiming for {fmtDate(goal.targetDate)}</span>}
            </div>
          </div>
        </div>

        {/* the path */}
        <ol className="mt-12 space-y-3">
          {milestones.map((m, i) => (
            <li key={m.id} className="panel rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold text-accent" style={{ background: "rgba(230,184,119,0.12)" }}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <StepRow node={m} />
                  {childrenOf(m.id).length > 0 && (
                    <ul className="mt-3 space-y-2 border-l border-line pl-4">
                      {childrenOf(m.id).map((c) => <li key={c.id}><StepRow node={c} sub /></li>)}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* CTA — the growth loop */}
        <div className="mt-14 flex flex-col items-center gap-3 text-center">
          <p className="text-[14px] text-muted">Map your own goal — Solaspace draws the whole path and helps you walk it.</p>
          <Link href="/" className="raised-gold inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[15px] font-medium">
            Start your map <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StepRow({ node, sub }: { node: SharedNode; sub?: boolean }) {
  const done = node.status === "done";
  const res = node.resourceKind && node.resourceLabel ? RES[node.resourceKind] : null;
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${done ? "bg-sage" : "border border-line"}`}>
          {done && <Check size={11} className="text-canvas" />}
        </span>
        <span className={`${sub ? "text-[13.5px]" : "text-[15px] font-medium"} leading-snug ${done ? "text-faint line-through" : "text-ink"}`}>{node.title}</span>
      </div>
      {res && node.resourceLabel && (
        <a href={searchUrl(node.resourceKind!, node.resourceLabel)} target="_blank" rel="noopener noreferrer" className="mt-1.5 ml-6 inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink">
          <res.Icon size={13} className="text-accent" /> {res.verb}: {node.resourceLabel} <ExternalLink size={11} className="text-faint" />
        </a>
      )}
    </div>
  );
}
