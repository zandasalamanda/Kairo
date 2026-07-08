"use client";

import * as React from "react";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/kairo/Logo";
import { Button } from "@/components/ui/Button";

export default function GatePage() {
  const [code, setCode] = React.useState("");
  const [err, setErr] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setErr(false);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        const to = new URLSearchParams(window.location.search).get("to");
        window.location.href = to && to.startsWith("/") ? to : "/";
        return;
      }
    } catch { /* fall through to error */ }
    setErr(true);
    setLoading(false);
  };

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mb-9 flex justify-center"><Logo size={30} /></div>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent/80">Early access</span>
        <h1 className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-tight text-ink">Solaspace is almost ready.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">Enter your access code to take a look around.</p>

        <form onSubmit={submit} className="mt-8">
          <div className="inset-well flex items-center gap-2 rounded-xl p-1.5 pl-4">
            <Lock size={15} className="shrink-0 text-faint" />
            <input
              autoFocus
              value={code}
              onChange={(e) => { setCode(e.target.value); setErr(false); }}
              placeholder="Access code"
              className="h-10 flex-1 bg-transparent text-[15px] tracking-wide text-ink placeholder:text-faint focus:outline-none"
              aria-label="Access code"
            />
            <Button type="submit" variant="primary" size="sm" disabled={!code.trim() || loading} aria-label="Enter">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            </Button>
          </div>
          {err && <p className="mt-3 text-[13px] text-warn">That code isn&apos;t right — try again.</p>}
        </form>
      </div>
    </div>
  );
}
