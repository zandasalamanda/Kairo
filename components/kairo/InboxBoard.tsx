"use client";

import * as React from "react";
import { Sparkle, Target, CalendarPlus, Archive, Plus, ChevronDown } from "lucide-react";
import type { InboxItem, InboxCategory } from "@/types";
import { sortInbox } from "@/lib/ai/sort-inbox";
import { inboxCategoryMeta, inboxCategoryOrder } from "@/lib/kairo/status";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { MicButton } from "@/components/ui/MicButton";
import { usePersistentState } from "@/lib/store/persist";
import { useSpeechInput } from "@/lib/hooks/use-speech-input";
import { addInboxItem, applyInboxSort, archiveInboxItem } from "@/lib/data/actions";
import { useToast } from "@/components/ui/Toast";
import { cn, newId } from "@/lib/utils";

interface LiteItem { id: string; content: string; category: InboxCategory }

export function InboxBoard({ initialItems, remote = false }: { initialItems: InboxItem[]; remote?: boolean }) {
  const [items, setItems] = usePersistentState<LiteItem[]>(
    "kairo.inbox.v1",
    initialItems.map((i) => ({ id: i.id, content: i.content, category: i.category })),
    !remote
  );
  const [input, setInput] = React.useState("");
  const [sorting, setSorting] = React.useState(false);
  const [sorted, setSorted] = React.useState(false);
  const [reasoning, setReasoning] = React.useState<string | null>(null);
  const toast = useToast();
  const speech = useSpeechInput(setInput);

  const add = () => {
    const c = input.trim(); if (!c) return;
    const id = newId();
    setItems((p) => [{ id, content: c, category: "unsorted" }, ...p]);
    setInput("");
    if (remote) void addInboxItem({ id, content: c });
  };
  const sortAll = async () => {
    setSorting(true); setReasoning(null);
    await new Promise((r) => setTimeout(r, 640));
    const res = await sortInbox({ items: items.map((i) => ({ id: i.id, content: i.content })) });
    const by = new Map(res.items.map((r) => [r.id, r.category]));
    setItems((p) => p.map((i) => ({ ...i, category: by.get(i.id) ?? i.category })));
    setReasoning(res.reasoning); setSorted(true); setSorting(false);
    if (remote) void applyInboxSort(res.items.map((r) => ({ id: r.id, category: r.category })));
  };
  const remove = (id: string, msg: string) => {
    setItems((p) => p.filter((i) => i.id !== id));
    toast(msg);
    if (remote) void archiveInboxItem({ id });
  };

  const groups: { category: InboxCategory; list: LiteItem[] }[] = [
    { category: "unsorted" as InboxCategory, list: items.filter((i) => i.category === "unsorted") },
    ...inboxCategoryOrder.map((c) => ({ category: c, list: items.filter((i) => i.category === c) })),
  ].filter((g) => g.list.length > 0);

  return (
    <div>
      {/* composer — matches the map's prompt bar */}
      <div className="inset-well flex items-center gap-2 rounded-2xl p-1.5 pl-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={speech.listening ? "Listening…" : "Drop anything here…"}
          className="h-10 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
        />
        {speech.supported && <MicButton listening={speech.listening} onClick={() => speech.toggle(input)} />}
        <button
          onClick={add}
          disabled={!input.trim()}
          aria-label="Add"
          className="raised-gold grid h-9 w-9 shrink-0 place-items-center rounded-xl disabled:opacity-30"
        >
          <Plus size={17} />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between px-1">
        <p className="text-[13px] text-muted">{reasoning ?? `${items.length} item${items.length === 1 ? "" : "s"}`}</p>
        <Button variant="glass" size="sm" onClick={sortAll} disabled={sorting || items.length === 0}>
          <Sparkle size={14} className={sorting ? "animate-pulse-soft" : ""} /> {sorting ? "Sorting…" : sorted ? "Re-sort" : "Sort with Sola"}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">Inbox zero. Drop new thoughts above whenever they land.</p>
      ) : !sorted ? (
        <div className={cn("mt-8 space-y-0.5 transition-opacity", sorting && "opacity-50")}>
          {items.map((item) => <ItemRow key={item.id} item={item} dot="bg-faint" onRemove={remove} />)}
        </div>
      ) : (
        <div className={cn("mt-8 space-y-9 transition-opacity", sorting && "opacity-50")}>
          {groups.map((g, gi) => {
            const meta = inboxCategoryMeta[g.category];
            return (
              <section key={g.category} className="animate-fade-up" style={{ animationDelay: `${gi * 70}ms` }}>
                <div className="mb-2 flex items-center gap-2 px-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                  <span className={cn("text-[11px] font-medium uppercase tracking-[0.14em]", meta.text)}>{meta.label}</span>
                  <span className="font-mono text-[11px] text-faint">{g.list.length}</span>
                </div>
                <div className="space-y-0.5">
                  {g.list.map((item) => <ItemRow key={item.id} item={item} dot={meta.dot} onRemove={remove} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, dot, onRemove }: { item: LiteItem; dot: string; onRemove: (id: string, msg: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={cn("rounded-xl transition-colors", open && "bg-[color-mix(in_srgb,var(--color-ink)_3%,transparent)]")}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
        <span className="min-w-0 flex-1 truncate text-[15px] text-ink/90">{item.content}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 px-3 pb-3 pl-[26px]">
          <Chip tone="accent" icon={<Target size={14} />} onClick={() => onRemove(item.id, "Sent to a goal.")}>To a goal</Chip>
          <Chip tone="accent" icon={<CalendarPlus size={14} />} onClick={() => onRemove(item.id, "Added to Today.")}>To Today</Chip>
          <Chip tone="warn" icon={<Archive size={14} />} onClick={() => onRemove(item.id, "Archived.")}>Archive</Chip>
        </div>
      )}
    </div>
  );
}
