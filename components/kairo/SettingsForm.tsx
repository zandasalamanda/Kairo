"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Zap, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import type { SessionUser } from "@/lib/auth";
import { clerkPublic } from "@/lib/config";
import { deleteAccount } from "@/lib/data/actions";
import { SectionLabel } from "./PageHeader";

function resetDemo() {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith("kairo."))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  window.location.href = "/app/map";
}

export function SettingsForm({ user }: { user: SessionUser }) {
  const [armed, setArmed] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const remove = async () => {
    setDeleting(true);
    await deleteAccount();
    window.location.href = "/";
  };

  return (
    <div className="space-y-5">
      {/* Profile */}
      <div className="panel rounded-2xl p-6">
        <SectionLabel className="mb-4">Profile</SectionLabel>
        <div className="flex items-center gap-4">
          <div className="raised-btn grid h-14 w-14 place-items-center rounded-full text-lg font-semibold text-ink">
            {user.initials}
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-semibold text-ink">{user.name}</div>
            <div className="text-sm text-muted">{user.email}</div>
          </div>
          <span className="ml-auto rounded-full border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-muted">
            {user.plan} plan
          </span>
        </div>
      </div>

      {/* Account */}
      <div className="panel rounded-2xl p-6">
        <SectionLabel className="mb-4">Account</SectionLabel>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/app/billing" className="raised-btn inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-medium text-accent">
            <Zap size={15} /> Manage plan
          </Link>
          {clerkPublic ? (
            <SignOutButton redirectUrl="/">
              <button className="raised-btn inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm text-muted hover:text-ink">
                <LogOut size={15} /> Sign out
              </button>
            </SignOutButton>
          ) : (
            <Link href="/" className="raised-btn inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm text-muted hover:text-ink">
              <LogOut size={15} /> Sign out
            </Link>
          )}
          {!clerkPublic && (
            <button onClick={resetDemo} className="raised-btn inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm text-muted hover:text-ink">
              <RotateCcw size={15} /> Reset demo data
            </button>
          )}
        </div>

        {clerkPublic && (
          <div className="mt-6 border-t border-line pt-5">
            <SectionLabel className="mb-2">Danger zone</SectionLabel>
            {armed ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[13px] text-warn">This permanently deletes your account, goals, and all data. This can&rsquo;t be undone.</span>
                <button onClick={() => setArmed(false)} disabled={deleting} className="raised-btn inline-flex h-9 items-center rounded-xl px-4 text-[13px] text-muted hover:text-ink">Cancel</button>
                <button onClick={remove} disabled={deleting} className="raised-btn inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-[13px] text-warn">
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete everything
                </button>
              </div>
            ) : (
              <button onClick={() => setArmed(true)} className="raised-btn inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm text-warn">
                <Trash2 size={15} /> Delete my account and data
              </button>
            )}
          </div>
        )}
        {!clerkPublic && <p className="mt-3 text-[12px] text-faint">Demo edits are stored in this browser. Reset clears them.</p>}
      </div>
    </div>
  );
}
