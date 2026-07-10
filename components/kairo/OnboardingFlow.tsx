"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import { generateGoalMap } from "@/lib/ai/generate-goal-map";
import { persistGoalFromMap } from "@/lib/data/actions";
import type { GoalMapResult } from "@/lib/ai/types";
import { GoalCore } from "./GoalCore";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { MicButton } from "@/components/ui/MicButton";
import { useSpeechInput } from "@/lib/hooks/use-speech-input";
import { nodeStatusMeta } from "@/lib/kairo/status";
import { track } from "@/lib/analytics";
import { cn, formatDuration, relativeDays } from "@/lib/utils";

const CHIPS = ["Launch a project", "Study better", "Get organized", "Save money", "Build a routine"];

// Where the typed goal waits while the visitor creates their account. Kept in
// sessionStorage (never a URL) so the goal text stays private and same-origin.
const PENDING_KEY = "solaspace:pending-goal";

type Step = "input" | "mapping" | "result";

export function OnboardingFlow({ remote = false, signedIn = false }: { remote?: boolean; signedIn?: boolean }) {
  const [step, setStep] = React.useState<Step>("input");
  const [prompt, setPrompt] = React.useState("");
  const [result, setResult] = React.useState<GoalMapResult | null>(null);
  const [goalId, setGoalId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const speech = useSpeechInput(setPrompt);
  const router = useRouter();

  // The actual mapping: generate → (when signed in) persist → show the path.
  // Only ever runs for a signed-in user, so every AI call is metered to an account.
  const runMap = React.useCallback(async (raw: string) => {
    const p = raw.trim();
    if (!p) return;
    setError(null);
    setStep("mapping");
    track("goal_mapping_started");
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const res = await generateGoalMap({ prompt: p });
      // If the AI fell back to a generic placeholder for a real account, don't
      // save it as their goal — surface the failure and let them retry.
      if (remote && res.isMock) {
        setError("Sola couldn't map that just now — you may have hit a limit, or the service is busy. Give it another go.");
        setStep("input");
        return;
      }
      setResult(res);
      if (remote) {
        const saved = await persistGoalFromMap({ result: res });
        if (!saved.ok) {
          setError("Your plan was created but couldn't be saved. Please try again.");
          setStep("input");
          return;
        }
        if (saved.id) setGoalId(saved.id);
      }
      track("goal_created", { remote });
      setStep("result");
    } catch (e) {
      console.error("[onboarding] submit failed", e);
      setError("Something went wrong mapping your goal. Please try again.");
      setStep("input");
    }
  }, [remote]);

  const submit = () => {
    const p = prompt.trim();
    if (!p) return;
    // Capture the goal first, then send them to make a free account — we map it
    // the moment they land back here. No anonymous AI calls (which would just
    // fail with a confusing limit error and be a way around the per-account limits).
    if (remote && !signedIn) {
      try { window.sessionStorage.setItem(PENDING_KEY, p); } catch { /* private mode */ }
      track("goal_capture_signup");
      router.push("/sign-up");
      return;
    }
    void runMap(p);
  };

  // Returning from sign-up (now signed in): pick up the goal they typed and map
  // it automatically, so account creation feels like part of the same motion.
  const claimed = React.useRef(false);
  React.useEffect(() => {
    if (claimed.current || !remote || !signedIn) return;
    let pending: string | null = null;
    try { pending = window.sessionStorage.getItem(PENDING_KEY); } catch { /* private mode */ }
    if (!pending) return;
    claimed.current = true;
    try { window.sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    setPrompt(pending);
    void runMap(pending);
  }, [remote, signedIn, runMap]);

  const reset = () => {
    setStep("input");
    setResult(null);
    setGoalId(null);
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center px-5 py-10">
      <Link href="/" className="mb-auto self-start"><Logo /></Link>

      {step === "input" && (
        <div className="my-auto w-full animate-fade-up text-center">
          <GoalCore size={140} className="mx-auto mb-8" />
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">What are we making happen?</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
            Tell Solaspace your goal. It will map the path and help build your day.
          </p>

          <div className="panel-2 mt-8 flex items-center gap-2 rounded-2xl p-2 pl-4 text-left">
            <input
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={speech.listening ? "Listening…" : "Launch my app by September…"}
              className="h-11 min-w-0 flex-1 bg-transparent pl-2 text-[15px] text-ink placeholder:text-faint focus:outline-none"
            />
            {speech.supported && <MicButton listening={speech.listening} onClick={() => speech.toggle(prompt)} />}
            <Button variant="primary" onClick={submit} disabled={!prompt.trim()} className="shrink-0 whitespace-nowrap">
              Map my goal <ArrowRight size={16} />
            </Button>
          </div>

          {error && <p className="mt-4 text-[13px] text-warn">{error}</p>}

          {remote && !signedIn && !error && (
            <p className="mt-3 text-[12.5px] text-faint">Free to start — you&apos;ll make your account next, and your goal will be waiting.</p>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => setPrompt(c)}
                className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-accent/40 hover:text-ink"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "mapping" && (
        <div className="my-auto flex flex-col items-center text-center">
          <GoalCore size={150} className="mb-8 animate-pulse-soft" />
          <p className="font-display text-xl font-medium text-ink">Mapping your goal…</p>
          <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.2em] text-accent/70">Solaspace is drawing the path</p>
        </div>
      )}

      {step === "result" && result && (
        <div className="my-auto w-full animate-fade-up">
          <div className="mb-6 flex items-center gap-4">
            <GoalCore size={72} orbit={false} pulse={false} />
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-semibold text-ink">{result.title}</h1>
              <p className="font-mono text-[12px] text-faint">
                Target {relativeDays(result.suggestedTargetDate)} · {result.weeklyRhythm}
              </p>
            </div>
          </div>

          <p className="mb-5 text-[15px] leading-relaxed text-muted">{result.description}</p>

          <div className="panel rounded-2xl p-4">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">The path · {result.nodes.length} steps</div>
            <ol className="space-y-1">
              {result.nodes.map((n, i) => {
                const meta = nodeStatusMeta[n.status];
                return (
                  <li key={i} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
                    <span className="font-mono text-[12px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink/90">{n.title}</span>
                    <span className="font-mono text-[11px] text-faint">{formatDuration(n.estimatedMinutes)}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-wide text-accent/80">First next action</span>
            <p className="mt-0.5 text-[14px] text-ink">{result.firstNextAction}</p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Link href={goalId ? `/app/map?goal=${goalId}` : "/app/map"} className="flex-1">
              <Button variant="primary" size="lg" className="w-full">
                Open my map <ArrowRight size={16} />
              </Button>
            </Link>
            <Button variant="glass" size="lg" onClick={reset}>
              <RotateCcw size={15} /> Start over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
