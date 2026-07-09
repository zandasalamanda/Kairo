"use client";

import * as React from "react";
import { updateNotificationPrefs } from "@/lib/data/actions";
import { SectionLabel } from "./PageHeader";
import { cn } from "@/lib/utils";

type Prefs = { email: boolean; deadlines: boolean; nudges: boolean; digest: boolean };

function Row({ label, desc, on, disabled, onChange }: { label: string; desc: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2.5", disabled && "opacity-40")}>
      <div className="min-w-0">
        <div className="text-[14px] text-ink">{label}</div>
        <div className="text-[12px] text-faint">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-white/10", disabled && "cursor-not-allowed")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

export function NotificationSettings({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = React.useState<Prefs>(initial);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const save = async (next: Prefs) => {
    const prev = prefs;
    setPrefs(next); // optimistic
    setSaving(true);
    setError(null);
    const res = await updateNotificationPrefs(next);
    setSaving(false);
    if (!res.ok) {
      setPrefs(prev); // roll back
      setError(res.error ?? "Couldn't save. Try again.");
    }
  };
  const set = (k: keyof Prefs) => (v: boolean) => save({ ...prefs, [k]: v });

  return (
    <div className="panel rounded-2xl p-6">
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>Email notifications</SectionLabel>
        {saving && <span className="font-mono text-[11px] text-faint">Saving…</span>}
      </div>
      <div className="divide-y divide-line">
        <Row label="All emails" desc="Master switch for everything below" on={prefs.email} onChange={set("email")} />
        <Row label="Deadline reminders" desc="When a goal is due within a few days" on={prefs.deadlines} disabled={!prefs.email} onChange={set("deadlines")} />
        <Row label="Weekly digest" desc="A short summary of your progress" on={prefs.digest} disabled={!prefs.email} onChange={set("digest")} />
        <Row label="Nudges" desc="A gentle poke after a quiet week" on={prefs.nudges} disabled={!prefs.email} onChange={set("nudges")} />
      </div>
      {error && <p className="mt-3 text-[12px] text-warn">{error}</p>}
    </div>
  );
}
