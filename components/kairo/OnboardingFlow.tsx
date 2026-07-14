"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw, Sparkles, Loader2, Plus } from "lucide-react";
import { generateGoalMap } from "@/lib/ai/generate-goal-map";
import { clarifyGoal } from "@/lib/ai/clarify";
import { persistGoalFromMap, deleteGoal } from "@/lib/data/actions";
import type { GoalMapResult, Clarifier } from "@/lib/ai/types";
import { GoalCore } from "./GoalCore";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { MicButton } from "@/components/ui/MicButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useSpeechInput } from "@/lib/hooks/use-speech-input";
import { usePersistentState } from "@/lib/store/persist";
import type { EnergyLevel } from "@/types";
import { nodeStatusMeta } from "@/lib/kairo/status";
import { track } from "@/lib/analytics";
import { cn, formatDuration, relativeDays } from "@/lib/utils";

const CHIPS = ["Launch a project", "Study better", "Get organized", "Save money", "Build a routine"];

// Where the typed goal waits while the visitor creates their account. Kept in
// sessionStorage (never a URL) so the goal text stays private and same-origin.
const PENDING_KEY = "solaspace:pending-goal";

type Step = "input" | "questions" | "mapping" | "result";

// Goal-gradient: the bar never sits at 0 — creating an account already counts as
// progress earned, so momentum toward the finished map starts the moment you arrive.
const STEP_PROGRESS: Record<Step, number> = { input: 18, questions: 45, mapping: 75, result: 100 };

export function OnboardingFlow({ remote = false, signedIn = false }: { remote?: boolean; signedIn?: boolean }) {
  const [step, setStep] = React.useState<Step>("input");
  // Smart defaults: a recommended time + energy budget, pre-selected so the task is
  // "scan & verify," not "fill in from scratch." Persisted for the daily planner.
  const [budget, setBudget] = usePersistentState<{ minutes: number; energy: EnergyLevel }>(
    "kairo.budget.v1",
    { minutes: 25, energy: "normal" }
  );
  const [prompt, setPrompt] = React.useState("");
  const [result, setResult] = React.useState<GoalMapResult | null>(null);
  const [goalId, setGoalId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // The same couple of tailored questions the in-app map asks — so the first map
  // through "Get started" isn't a worse, question-less version of the real flow.
  const [clarifiers, setClarifiers] = React.useState<Clarifier[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [extra, setExtra] = React.useState("");
  const [showMore, setShowMore] = React.useState(false);
  const [qLoading, setQLoading] = React.useState(false);
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
        // Watch this in analytics — it's the first-impression failure rate.
        track("goal_map_failed", { reason: "mock_fallback" });
        setError("Sola couldn't map that. You may have hit a limit, or the service is busy. Try again.");
        setStep("input");
        return;
      }
      setResult(res);
      if (remote) {
        const saved = await persistGoalFromMap({ result: res });
        if (!saved.ok) {
          // Hit the Free goal cap → the highest-intent upgrade moment; send them
          // to billing rather than a dead error.
          if (saved.upgrade) { router.push("/app/billing"); return; }
          setError(saved.error ?? "Your plan was created but couldn't be saved. Please try again.");
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
  }, [remote, router]);

  // Step 1 → ask a couple of tailored questions before generating (one small AI
  // call), just like the in-app map. Only runs when signed in, so no anonymous AI.
  const askQuestions = React.useCallback(async (raw: string) => {
    const p = raw.trim();
    if (!p) return;
    setError(null);
    setPrompt(p);
    setAnswers({}); setExtra(""); setShowMore(false); setClarifiers([]);
    setQLoading(true);
    setStep("questions");
    try {
      const cs = await clarifyGoal(p);
      if (cs.length === 0) { void runMap(p); return; } // nothing worth asking — just map
      setClarifiers(cs);
    } catch {
      void runMap(p); // clarify hiccup — map without questions rather than dead-end
      return;
    } finally {
      setQLoading(false);
    }
  }, [runMap]);

  // Step 2 → fold the answers into the prompt and generate, exactly like the map.
  const finishQuestions = () => {
    const parts = Object.entries(answers).filter(([, a]) => a).map(([q, a]) => `${q.replace(/\?$/, "")}: ${a}`);
    if (extra.trim()) parts.push(extra.trim());
    void runMap(parts.length ? `${prompt} — ${parts.join("; ")}` : prompt);
  };
  const pick = (q: string, o: string) => setAnswers((a) => ({ ...a, [q]: a[q] === o ? "" : o }));

  const submit = () => {
    const p = prompt.trim();
    if (!p) return;
    // Capture the goal first, then send them to make a free account — we ask the
    // questions and map the moment they land back here. No anonymous AI calls.
    if (remote && !signedIn) {
      try { window.sessionStorage.setItem(PENDING_KEY, p); } catch { /* private mode */ }
      track("goal_capture_signup");
      router.push("/sign-up");
      return;
    }
    void askQuestions(p);
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
    void askQuestions(pending);
  }, [remote, signedIn, askQuestions]);

  const reset = () => {
    // "Start over" discards the map we just saved — delete it so it doesn't linger
    // as an abandoned goal (which would also silently burn a Free goal slot).
    if (remote && goalId) void deleteGoal({ goalId });
    setStep("input");
    setResult(null);
    setGoalId(null);
  };

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col items-center px-5 py-10">
      {/* Goal-gradient progress — pinned to the top, advances with each step, never 0%. */}
      <div className="fixed inset-x-0 top-0 z-20 h-1 bg-white/[0.04]" aria-hidden>
        <div
          className="h-full bg-accent"
          style={{ width: `${STEP_PROGRESS[step]}%`, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)", boxShadow: "0 0 8px var(--color-accent)" }}
        />
      </div>
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
            <p className="mt-3 text-[13px] text-faint">Free to start — you&apos;ll make your account next, and your goal will be waiting.</p>
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

          {/* Smart defaults: recommended time + energy, pre-selected — scan & verify. */}
          <div className="mx-auto mt-8 max-w-md">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">The time &amp; energy you have today</div>
            <div className="grid grid-cols-2 gap-3">
              <SegmentedControl
                options={[{ value: "15", label: "15m" }, { value: "25", label: "25m" }, { value: "50", label: "50m" }]}
                value={String(budget.minutes)}
                onChange={(v) => setBudget((b) => ({ ...b, minutes: Number(v) }))}
              />
              <SegmentedControl
                options={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }]}
                value={budget.energy}
                onChange={(v) => setBudget((b) => ({ ...b, energy: v as EnergyLevel }))}
              />
            </div>
          </div>
        </div>
      )}

      {step === "questions" && (
        <div className="my-auto w-full max-w-md animate-fade-up text-center">
          <GoalCore size={104} className="mx-auto mb-6" />
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">A couple quick things</h1>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">
            So Sola maps <span className="text-ink">{prompt}</span> for you specifically — all optional.
          </p>

          <div className="panel-2 mt-7 rounded-2xl p-4 text-left">
            {qLoading ? (
              <div className="flex items-center gap-2 py-3 text-[13px] text-muted">
                <Loader2 size={15} className="animate-spin text-accent" /> Thinking of a couple questions…
              </div>
            ) : (
              <div className="space-y-3.5">
                {clarifiers.map((c, qi) => (
                  <div key={qi}>
                    <div className="mb-1.5 text-[13px] text-ink/80">{c.question}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.options.map((o) => (
                        <Chip key={o} tone="accent" active={answers[c.question] === o} onClick={() => pick(c.question, o)}>{o}</Chip>
                      ))}
                    </div>
                  </div>
                ))}
                {showMore ? (
                  <textarea
                    autoFocus
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    placeholder="Anything else? Your level, constraints, what you already have…"
                    className="inset-well min-h-[64px] w-full resize-none rounded-xl px-3.5 py-2.5 text-[13px] text-ink placeholder:text-faint focus-visible:outline-none"
                  />
                ) : (
                  <button onClick={() => setShowMore(true)} className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink">
                    <Plus size={13} /> Tell me more
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2.5">
            <Button variant="glass" onClick={() => void runMap(prompt)} disabled={qLoading}>Skip</Button>
            <Button variant="primary" onClick={finishQuestions} disabled={qLoading}>
              <Sparkles size={15} /> Map my goal
            </Button>
          </div>
        </div>
      )}

      {step === "mapping" && (
        <div className="my-auto flex flex-col items-center text-center">
          <GoalCore size={150} className="mb-8 animate-pulse-soft" />
          <p className="font-display text-xl font-medium text-ink">Mapping your goal…</p>
          <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.2em] text-accent/70">Sola is drawing your path</p>
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
