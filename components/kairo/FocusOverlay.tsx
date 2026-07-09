"use client";

import * as React from "react";
import { X, Play, Pause, Check, RotateCcw, Flag, HelpCircle, PenLine, Loader2, Save, RefreshCw, ArrowLeft } from "lucide-react";
import { planSession, unblock } from "@/lib/ai/work-session";
import { draftForStep } from "@/lib/ai/draft";
import type { WorkSessionResult, DraftResult } from "@/lib/ai/types";
import { Markdown } from "./Markdown";
import { cn } from "@/lib/utils";

const OPTIONS = [15, 25, 50];

/**
 * A focus session on a single step — a calm timer that Solaspace sits down with you
 * for. On open it plans the session (a first move + a short checklist); for desk
 * steps it can co-write a real draft, and "Stuck?" unblocks you. Completing it
 * logs the step done. Each AI beat is one user-initiated call.
 */
export function FocusOverlay({
  title,
  goalTitle,
  nodeDescription,
  context,
  hex,
  onComplete,
  onClose,
  onSaveArtifact,
}: {
  title: string;
  goalTitle: string;
  nodeDescription: string;
  context?: string;
  hex: string;
  /** called with the minutes actually spent in focus */
  onComplete: (minutes: number) => void;
  onClose: () => void;
  onSaveArtifact: (title: string, content: string) => void;
}) {
  const [minutes, setMinutes] = React.useState(25);
  const [left, setLeft] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);

  // Session plan (fetched once on open).
  const [plan, setPlan] = React.useState<WorkSessionResult | null>(null);
  const [planLoading, setPlanLoading] = React.useState(true);
  const [checked, setChecked] = React.useState<Set<number>>(() => new Set());

  // Stuck? — an unblock answer, only when asked.
  const [stuckLoading, setStuckLoading] = React.useState(false);
  const [stuckAnswer, setStuckAnswer] = React.useState<string | null>(null);

  // Draft with Solaspace (desk steps).
  const [drafting, setDrafting] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftResult | null>(null);
  const [draftLoading, setDraftLoading] = React.useState(false);
  const [draftBody, setDraftBody] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [editingDraft, setEditingDraft] = React.useState(false);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setRunning(false);
          setDone(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  React.useEffect(() => {
    // planLoading starts true; this runs once (overlay is keyed by node id upstream).
    let alive = true;
    planSession({ goalTitle, nodeTitle: title, nodeDescription, minutes: 25, context })
      .then((p) => { if (alive) { setPlan(p); setPlanLoading(false); } })
      .catch(() => { if (alive) setPlanLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDur = (m: number) => { setMinutes(m); setLeft(m * 60); setDone(false); setRunning(false); };
  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });

  const runStuck = async () => {
    if (stuckLoading) return;
    setStuckLoading(true);
    const r = await unblock({ goalTitle, nodeTitle: title, context });
    setStuckAnswer(r.answer);
    setStuckLoading(false);
  };

  const fetchDraft = async () => {
    setDraftLoading(true);
    setSaved(false);
    setEditingDraft(false);
    const d = await draftForStep({ goalTitle, nodeTitle: title, nodeDescription, context });
    setDraft(d);
    setDraftBody(d.content);
    setDraftLoading(false);
  };
  const openDraft = () => { setDrafting(true); if (!draft) void fetchDraft(); };
  const saveDraft = () => { if (draft) { onSaveArtifact(draft.title, draftBody); setSaved(true); } };

  const total = minutes * 60;
  const complete = () => onComplete(Math.max(1, Math.round((total - left) / 60)));
  const pct = total ? 1 - left / total : 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const R = 100;
  const C = 2 * Math.PI * R;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas/95 backdrop-blur-xl">
      <button
        onClick={onClose}
        className="fixed right-5 top-[calc(env(safe-area-inset-top)+16px)] z-10 grid h-10 w-10 place-items-center rounded-full text-faint transition-colors hover:text-ink"
        aria-label="Close focus session"
      >
        <X size={18} />
      </button>

      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">{done ? "Session complete" : "Focus session"}</span>
          <h2 className="mt-2 line-clamp-2 font-display text-xl font-semibold text-ink">{title}</h2>

          <div className="relative my-8 grid place-items-center" style={{ width: 224, height: 224 }}>
            <span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${hex}22, transparent 70%)` }} />
            <svg width={224} height={224} className="absolute -rotate-90">
              <circle cx={112} cy={112} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
              <circle
                cx={112}
                cy={112}
                r={R}
                fill="none"
                stroke={hex}
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={(1 - pct) * C}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <span
              className={cn("grid h-40 w-40 place-items-center rounded-full", running && "animate-pulse-soft")}
              style={{ background: `radial-gradient(circle at 36% 30%, ${hex}33, rgba(12,14,18,0.9) 72%)`, boxShadow: `0 0 60px ${hex}33, inset 0 0 30px ${hex}22` }}
            >
              <span className="font-display text-4xl font-bold tabular-nums text-ink">{mm}:{ss}</span>
            </span>
          </div>

          {!running && !done && (
            <div className="inset-well mb-6 flex gap-1 rounded-xl p-1">
              {OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setDur(m)}
                  className={cn("rounded-lg px-4 py-2 text-sm transition-colors", minutes === m ? "raised-btn text-ink" : "text-muted hover:text-ink")}
                >
                  {m}m
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            {done ? (
              <button onClick={complete} className="raised-gold inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-medium">
                <Check size={18} /> Mark complete
              </button>
            ) : (
              <>
                <button onClick={() => setRunning((r) => !r)} className="raised-gold inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-medium">
                  {running ? <><Pause size={18} /> Pause</> : <><Play size={18} /> {left < total ? "Resume" : "Start"}</>}
                </button>
                <button onClick={complete} className="raised-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] text-sage">
                  <Check size={16} /> Done
                </button>
              </>
            )}
          </div>

          {!done && left < total && (
            <button onClick={() => setDur(minutes)} className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-faint transition-colors hover:text-muted">
              <RotateCcw size={12} /> Reset
            </button>
          )}

          {/* Session plan — the part that helps you actually start. */}
          <div className="mt-8 w-full">
            {drafting ? (
              <div className="panel rounded-2xl p-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button onClick={() => setDrafting(false)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Back to session"><ArrowLeft size={15} /></button>
                    <span className="truncate font-display text-[15px] font-semibold text-ink">{draft?.title ?? "Drafting"}</span>
                  </div>
                  {!draftLoading && draft && (
                    <div className="flex shrink-0 items-center gap-3">
                      <button onClick={() => setEditingDraft((e) => !e)} className="text-[12px] text-faint transition-colors hover:text-muted">{editingDraft ? "Preview" : "Edit"}</button>
                      <button onClick={() => void fetchDraft()} className="inline-flex items-center gap-1.5 text-[12px] text-faint transition-colors hover:text-muted"><RefreshCw size={12} /> Redo</button>
                    </div>
                  )}
                </div>
                {draftLoading ? (
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-full animate-pulse rounded bg-white/5" />
                    <div className="h-3 w-11/12 animate-pulse rounded bg-white/5" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
                    <p className="pt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Solaspace is drafting…</p>
                  </div>
                ) : (
                  <>
                    {editingDraft ? (
                      <textarea
                        autoFocus
                        value={draftBody}
                        onChange={(e) => { setDraftBody(e.target.value); setSaved(false); }}
                        className="mt-3 min-h-[220px] w-full resize-none rounded-xl border border-transparent bg-white/[0.03] p-3 text-[14px] leading-relaxed text-ink transition-colors focus:outline-none focus:border-accent/40 focus-visible:shadow-none"
                      />
                    ) : (
                      <div className="mt-3 min-h-[220px] rounded-xl bg-white/[0.03] p-3 text-[14px] leading-relaxed text-ink">
                        <Markdown>{draftBody}</Markdown>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button onClick={saveDraft} disabled={saved || !draftBody.trim()} className="raised-gold inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium disabled:opacity-40">
                        {saved ? <><Check size={14} /> Saved to notebook</> : <><Save size={14} /> Save to notebook</>}
                      </button>
                      <span className="text-[11px] text-faint">Edit freely — it&apos;s yours</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="panel rounded-2xl p-4 text-left">
                {planLoading ? (
                  <div className="space-y-2.5">
                    <div className="h-3 w-40 animate-pulse rounded bg-white/5" />
                    <div className="h-3 w-full animate-pulse rounded bg-white/5" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
                    <p className="pt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Setting up your session…</p>
                  </div>
                ) : plan ? (
                  <>
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: `${hex}22` }}>
                        <Flag size={13} style={{ color: hex }} />
                      </span>
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">First move</span>
                        <p className="text-[14px] font-medium leading-snug text-ink">{plan.firstMove}</p>
                      </div>
                    </div>

                    {plan.steps.length > 0 && (
                      <ul className="mt-3.5 space-y-2 border-t border-line pt-3.5">
                        {plan.steps.map((s, i) => {
                          const on = checked.has(i);
                          return (
                            <li key={i}>
                              <button onClick={() => toggle(i)} className="flex w-full items-center gap-2.5 text-left">
                                <span
                                  className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors", on ? "border-transparent" : "border-line")}
                                  style={on ? { background: hex } : undefined}
                                >
                                  {on && <Check size={13} className="text-white" />}
                                </span>
                                <span className={cn("text-[14px] leading-snug transition-colors", on ? "text-faint line-through" : "text-muted")}>{s}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      <button onClick={() => void runStuck()} className="raised-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:text-ink">
                        {stuckLoading ? <Loader2 size={13} className="animate-spin" /> : <HelpCircle size={13} />} Stuck?
                      </button>
                      {plan.kind === "desk" && (
                        <button onClick={openDraft} className="raised-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-accent transition-colors hover:text-ink">
                          <PenLine size={13} /> Draft with Solaspace
                        </button>
                      )}
                    </div>

                    {stuckAnswer && (
                      <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-[13px] leading-relaxed text-muted"><Markdown>{stuckAnswer}</Markdown></div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
