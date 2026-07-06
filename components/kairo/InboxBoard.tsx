"use client";

import * as React from "react";
import { Sparkle, Target, CalendarPlus, Archive } from "lucide-react";
import type { InboxItem, InboxCategory } from "@/types";
import { sortInbox } from "@/lib/ai/sort-inbox";
import { inboxCategoryMeta, inboxCategoryOrder } from "@/lib/kairo/status";
import { cn, makeId } from "@/lib/utils";

interface LiteItem { id: string; content: string; category: InboxCategory }

export function InboxBoard({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = React.useState<LiteItem[]>(initialItems.map((i) => ({ id: i.id, content: i.content, category: i.category })));
  const [input, setInput] = React.useState("");
  const [sorting, setSorting] = React.useState(false);
  const [flash, setFlash] = React.useState<string | null>(null);

  const unsorted = items.filter((i) => i.category === "unsorted");

  const add = () => {
    const c = input.trim(); if (!c) return;
    setItems((p) => [{ id: makeId("inbox"), content: c, category: "unsorted" }, ...p]);
    setInput("");
  };
  const sortAll = async () => {
    setSorting(true);
    await new Promise((r) => setTimeout(r, 620));
    const res = await sortInbox({ items: items.map((i) => ({ id: i.id, content: i.content })) });
    const by = new Map(res.items.map((r) => [r.id, r.category]));
    setItems((p) => p.map((i) => ({ ...i, category: by.get(i.id) ?? i.category })));
    setSorting(false);
  };
  const remove = (id: string, msg: string) => {
    setItems((p) => p.filter((i) => i.id !== id));
    setFlash(msg); window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 2200);
  };

  return (
    <div>
      {/* composer */}
      <div className="mb-2 flex items-center gap-3 border-b border-line pb-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Drop anything here…"
          className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
        />
        <button
          onClick={sortAll}
          disabled={sorting || items.length === 0}
          className="inline-flex items-center gap-1.5 text-[13px] text-accent transition-opacity hover:opacity-80 disabled:opacity-30"
        >
          <Sparkle size={14} /> {sorting ? "Sorting…" : "Sort"}
        </button>
      </div>

      {flash && <p className="py-2 text-center text-[13px] text-sage">{flash}</p>}

      {items.length === 0 ? (
        <p className="py-14 text-center text-sm text-muted">Inbox zero. Drop new thoughts above whenever they land.</p>
      ) : (
        <div className={cn("mt-2 transition-opacity", sorting && "opacity-50")}>
          {unsorted.length > 0 && <Group items={unsorted} category="unsorted" onRemove={remove} />}
          {inboxCategoryOrder.map((cat) => {
            const list = items.filter((i) => i.category === cat);
            return list.length ? <Group key={cat} items={list} category={cat} onRemove={remove} /> : null;
          })}
        </div>
      )}
    </div>
  );
}

function Group({ items, category, onRemove }: { items: LiteItem[]; category: InboxCategory; onRemove: (id: string, msg: string) => void }) {
  const meta = inboxCategoryMeta[category];
  return (
    <section className="mb-6">
      <div className="mb-1 flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
        <h2 className={cn("text-[12px] font-medium uppercase tracking-wide", meta.text)}>{meta.label}</h2>
        <span className="font-mono text-[11px] text-faint">{items.length}</span>
      </div>
      <ul className="divide-y divide-line/60">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[14px] text-ink/90">{item.content}</span>
            <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Mini icon={<Target size={14} />} label="To a goal" onClick={() => onRemove(item.id, "Sent to a goal.")} />
              <Mini icon={<CalendarPlus size={14} />} label="To Today" onClick={() => onRemove(item.id, "Added to Today.")} />
              <Mini icon={<Archive size={14} />} label="Archive" onClick={() => onRemove(item.id, "Archived.")} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Mini({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-white/5 hover:text-ink">
      {icon}
    </button>
  );
}
