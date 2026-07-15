"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, ArrowUp, Loader2, Plus, PencilLine, Check, CalendarClock, GitBranch } from "lucide-react";
import { SolaMark } from "./SolaMark";
import type { GoalWithNodes } from "@/types";
import type { SolaChange, SolaChangeKind, SolaPlanGoal } from "@/lib/ai/types";
import { askSola } from "@/lib/ai/ask-sola";
import { AiError } from "@/lib/ai/provider";
import { addNode, updateNode, setNodeStatus, setGoalDeadline } from "@/lib/data/actions";
import { parseDeadline } from "@/lib/kairo/deadline";
import { Markdown } from "./Markdown";
import { newId, cn } from "@/lib/utils";

type PendingChange = SolaChange & { on: boolean };
interface Msg { id: string; role: "user" | "sola"; text: string; changes?: PendingChange[]; applied?: boolean; upgrade?: boolean }

const META: Record<SolaChangeKind, { label: string; Icon: typeof Plus; tone: string }> = {
  add: { label: "Add", Icon: Plus, tone: "text-sage" },
  edit: { label: "Rename", Icon: PencilLine, tone: "text-accent" },
  status: { label: "Status", Icon: Check, tone: "text-sage" },
  deadline: { label: "Deadline", Icon: CalendarClock, tone: "text-accent" },
  split: { label: "Split", Icon: GitBranch, tone: "text-accent" },
};

export function AskSola({ goals, remote, isPro, onClose }: { goals: GoalWithNodes[]; remote: boolean; isPro: boolean; onClose: () => void }) {
  const router = useRouter();
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const nodeTitle = (nodeId?: string) => {
    for (const g of goals) { const n = g.nodes.find((x) => x.id === nodeId); if (n) return n.title; }
    return "step";
  };
  const changeText = (c: SolaChange): string => {
    switch (c.kind) {
      case "add": return `Add “${c.title}”${c.parentId ? ` under “${nodeTitle(c.parentId)}”` : ""}`;
      case "edit": return `Rename “${nodeTitle(c.nodeId)}” → “${c.title}”`;
      case "status": return `Mark “${nodeTitle(c.nodeId)}” ${c.status?.replace("_", " ")}`;
      case "deadline": return `Set deadline: ${c.date}`;
      case "split": return `Split “${nodeTitle(c.nodeId)}” into ${c.into?.length} steps`;
    }
  };

  React.useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { id: newId(), role: "user", text: msg }]);
    setLoading(true);
    const plan: SolaPlanGoal[] = goals.filter((g) => g.status === "active").map((g) => ({
      id: g.id, title: g.title, targetDate: g.targetDate,
      nodes: g.nodes.map((n) => ({ id: n.id, parentId: n.parentId, title: n.title, status: n.status })),
    }));
    try {
      const res = await askSola({ message: msg, plan });
      setMessages((m) => [...m, { id: newId(), role: "sola", text: res.reply, changes: res.changes.map((c) => ({ ...c, on: true })) }]);
    } catch (e) {
      // Free daily used up (or another block) → a calm upgrade nudge, not an error blob.
      const ai = e instanceof AiError ? e : null;
      setMessages((m) => [...m, {
        id: newId(), role: "sola",
        text: ai?.message ?? "Sola couldn't respond just now — try again in a moment.",
        upgrade: !!ai?.upgrade,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const apply = (msgId: string, changes: PendingChange[]) => {
    const chosen = changes.filter((c) => c.on);
    if (!chosen.length || !remote) { if (!remote) alert("Sign in to let Sola edit your plan."); return; }
    const order = new Map<string, number>();
    const nextOrder = (goalId: string) => {
      const cur = order.get(goalId) ?? (goals.find((g) => g.id === goalId)?.nodes.length ?? 0);
      order.set(goalId, cur + 1);
      return cur;
    };
    for (const c of chosen) {
      if (c.kind === "add" && c.title) {
        void addNode({ id: newId(), goalId: c.goalId, title: c.title, estimatedMinutes: 30, sortOrder: nextOrder(c.goalId), parentId: c.parentId ?? null });
      } else if (c.kind === "edit" && c.nodeId && c.title) {
        void updateNode({ nodeId: c.nodeId, title: c.title });
      } else if (c.kind === "status" && c.nodeId && c.status) {
        void setNodeStatus({ goalId: c.goalId, nodeId: c.nodeId, status: c.status });
      } else if (c.kind === "deadline" && c.date) {
        const parsed = parseDeadline(c.date);
        if (parsed) void setGoalDeadline({ goalId: c.goalId, iso: parsed.iso });
      } else if (c.kind === "split" && c.nodeId && c.into) {
        for (const t of c.into) void addNode({ id: newId(), goalId: c.goalId, title: t, estimatedMinutes: 30, sortOrder: nextOrder(c.goalId), parentId: c.nodeId });
      }
    }
    setMessages((m) => m.map((x) => (x.id === msgId ? { ...x, applied: true } : x)));
    router.refresh();
  };

  const toggle = (msgId: string, i: number) =>
    setMessages((m) => m.map((x) => (x.id === msgId && x.changes ? { ...x, changes: x.changes.map((c, j) => (j === i ? { ...c, on: !c.on } : c)) } : x)));

  return (
    <div className="chrome animate-sheet-up fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[400px] flex-col border-l border-line">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3.5">
        <SolaMark size={16} />
        <span className="flex-1 font-display text-[15px] font-semibold text-ink">Ask Sola</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">{isPro ? "Pro" : "2 free / day"}</span>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:text-ink" aria-label="Close"><X size={17} /></button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-6 text-center text-[13px] leading-relaxed text-muted">
            <p className="text-ink">I can read and reshape your whole plan.</p>
            <p className="mt-2">Try: <span className="text-muted">“break the launch step into smaller ones”</span>, <span className="text-muted">“push my fitness deadline to 3 months”</span>, or <span className="text-muted">“mark the research step done.”</span></p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed", m.role === "user" ? "raised-btn text-ink" : "bg-white/[0.03] text-muted")}>
              {m.role === "sola" ? <Markdown>{m.text}</Markdown> : <p className="whitespace-pre-line">{m.text}</p>}
              {m.upgrade && (
                <button onClick={() => { onClose(); router.push("/app/billing"); }} className="raised-gold mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium">
                  Upgrade to Pro
                </button>
              )}
              {m.changes && m.changes.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {m.changes.map((c, i) => {
                    const mm = META[c.kind];
                    return (
                      <button key={i} disabled={m.applied} onClick={() => toggle(m.id, i)} className={cn("flex w-full items-start gap-2 rounded-lg border border-line px-2.5 py-2 text-left transition-opacity", !c.on && "opacity-40", m.applied && "pointer-events-none")}>
                        <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border", c.on ? "border-transparent bg-accent" : "border-line")}>{c.on && <Check size={11} className="text-canvas" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide", mm.tone)}><mm.Icon size={11} /> {mm.label}</span>
                          <span className="mt-0.5 block text-[13px] text-ink">{changeText(c)}</span>
                          {c.reason && <span className="block text-[11px] text-faint">{c.reason}</span>}
                        </span>
                      </button>
                    );
                  })}
                  {m.applied ? (
                    <p className="pt-1 text-[12px] text-sage">✓ Applied. Your plan’s updated.</p>
                  ) : (
                    <button onClick={() => apply(m.id, m.changes!)} disabled={!m.changes.some((c) => c.on)} className="raised-gold mt-1 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium disabled:opacity-40">
                      Apply {m.changes.filter((c) => c.on).length} change{m.changes.filter((c) => c.on).length === 1 ? "" : "s"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="rounded-2xl bg-white/[0.03] px-3.5 py-2.5"><Loader2 size={15} className="animate-spin text-accent" /></div></div>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="border-t border-line p-3">
        <div className="inset-well flex items-center gap-2 rounded-xl p-1 pl-3.5">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Sola to change your plan…" className="h-9 flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none" autoFocus />
          <button type="submit" disabled={!input.trim() || loading} className="raised-gold grid h-8 w-8 shrink-0 place-items-center rounded-lg disabled:opacity-30" aria-label="Send">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
