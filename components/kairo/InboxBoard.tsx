"use client";

import * as React from "react";
import { Plus, Sparkle, Target, CalendarPlus, Archive } from "lucide-react";
import type { InboxItem, InboxCategory } from "@/types";
import { sortInbox } from "@/lib/ai/sort-inbox";
import { inboxCategoryMeta, inboxCategoryOrder } from "@/lib/kairo/status";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, makeId } from "@/lib/utils";

interface LiteItem {
  id: string;
  content: string;
  category: InboxCategory;
}

export function InboxBoard({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = React.useState<LiteItem[]>(
    initialItems.map((i) => ({ id: i.id, content: i.content, category: i.category }))
  );
  const [input, setInput] = React.useState("");
  const [sorting, setSorting] = React.useState(false);
  const [reasoning, setReasoning] = React.useState<string | null>(null);
  const [flash, setFlash] = React.useState<string | null>(null);

  const unsorted = items.filter((i) => i.category === "unsorted");

  const add = () => {
    const content = input.trim();
    if (!content) return;
    setItems((prev) => [{ id: makeId("inbox"), content, category: "unsorted" }, ...prev]);
    setInput("");
  };

  const sortAll = async () => {
    setSorting(true);
    setReasoning(null);
    await new Promise((r) => setTimeout(r, 640));
    const res = await sortInbox({ items: items.map((i) => ({ id: i.id, content: i.content })) });
    const byId = new Map(res.items.map((r) => [r.id, r.category]));
    setItems((prev) => prev.map((i) => ({ ...i, category: byId.get(i.id) ?? i.category })));
    setReasoning(res.reasoning);
    setSorting(false);
  };

  const remove = (id: string, msg: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setFlash(msg);
    window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 2400);
  };

  return (
    <div className="space-y-6">
      {/* composer */}
      <div className="panel rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Drop anything here…"
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button variant="glass" onClick={add} className="flex-1 sm:flex-none">
              <Plus size={16} /> Add
            </Button>
            <Button variant="primary" onClick={sortAll} disabled={sorting || items.length === 0} className="flex-1 sm:flex-none">
              <Sparkle size={16} /> {sorting ? "Sorting…" : "Sort with AI"}
            </Button>
          </div>
        </div>
        {reasoning && <p className="mt-3 px-1 text-[13px] text-accent/90">{reasoning}</p>}
      </div>

      {flash && (
        <div className="animate-fade-in rounded-xl border border-sage/20 bg-sage/5 px-4 py-2.5 text-center text-[13px] text-sage">
          {flash}
        </div>
      )}

      {items.length === 0 ? (
        <div className="panel rounded-2xl">
          <EmptyState icon={<Archive size={22} />} title="Inbox zero" description="Everything's sorted. Drop new thoughts above whenever they land." />
        </div>
      ) : (
        <div className="space-y-6">
          {unsorted.length > 0 && (
            <CategorySection category="unsorted" items={unsorted} onRemove={remove} sorting={sorting} />
          )}
          {inboxCategoryOrder.map((cat) => {
            const list = items.filter((i) => i.category === cat);
            if (list.length === 0) return null;
            return <CategorySection key={cat} category={cat} items={list} onRemove={remove} sorting={sorting} />;
          })}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  items,
  onRemove,
  sorting,
}: {
  category: InboxCategory;
  items: LiteItem[];
  onRemove: (id: string, msg: string) => void;
  sorting: boolean;
}) {
  const meta = inboxCategoryMeta[category];
  return (
    <section className={cn("transition-opacity", sorting && "opacity-60")}>
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
        <h2 className={cn("text-sm font-semibold", meta.text)}>{meta.label}</h2>
        <span className="font-mono text-[11px] text-faint">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="panel group flex items-center gap-3 rounded-xl px-4 py-3">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
            <span className="min-w-0 flex-1 truncate text-[14px] text-ink/90">{item.content}</span>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <IconAction icon={<Target size={14} />} label="Send to a goal" onClick={() => onRemove(item.id, "Sent to a goal step.")} />
              <IconAction icon={<CalendarPlus size={14} />} label="Add to Today" onClick={() => onRemove(item.id, "Added to Today.")} />
              <IconAction icon={<Archive size={14} />} label="Archive" onClick={() => onRemove(item.id, "Archived.")} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IconAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-ink"
    >
      {icon}
    </button>
  );
}
