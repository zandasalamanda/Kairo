import Link from "next/link";
import { ArrowRight, Waypoints, Sunrise, Inbox, Target, LifeBuoy, Activity } from "lucide-react";
import { Logo } from "@/components/kairo/Logo";
import { OrbBackground } from "@/components/kairo/OrbBackground";
import { LivingGoalMap } from "@/components/kairo/LivingGoalMap";
import { SectionLabel } from "@/components/kairo/PageHeader";
import { buildSeed } from "@/lib/mock/seed";

const FEATURES = [
  { icon: Waypoints, title: "Living Goal Maps", desc: "Every goal becomes a glowing map of steps — the next move pulses, the rest waits." },
  { icon: Sunrise, title: "Daily Time Builder", desc: "Give Kairo your time and energy. It builds the most efficient plan for today." },
  { icon: Inbox, title: "Idea Inbox", desc: "Dump every loose thought. Kairo sorts it into must-do, high-impact, and can-wait." },
  { icon: Target, title: "Focus Path", desc: "One clear path through the day, ordered so momentum compounds." },
  { icon: LifeBuoy, title: "Recovery Mode", desc: "Pushed a task? Kairo reshapes the plan and shows how to get back on track." },
  { icon: Activity, title: "Weekly Review", desc: "See what moved, what's at risk, and the single best move next." },
];

const STEPS = [
  { n: "01", title: "Tell Kairo your goal", desc: "Type what you want done. Kairo maps the whole path in seconds." },
  { n: "02", title: "Map the path", desc: "Watch it become a living map of steps, estimates, and next actions." },
  { n: "03", title: "Build today", desc: "Enter your time and energy. Kairo builds the plan that fits." },
  { n: "04", title: "Rebuild when life changes", desc: "Push, shrink, or split anything. The plan stays honest and recoverable." },
];

export default function LandingPage() {
  const goal = buildSeed().goals[0];

  return (
    <div className="relative overflow-hidden">
      <OrbBackground />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#how" className="transition-colors hover:text-ink">How it works</a>
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#pricing" className="transition-colors hover:text-ink">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="hidden rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-ink sm:block">
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#1b1206] transition-all hover:brightness-105"
            >
              Start
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:py-24 lg:grid-cols-2">
        <div className="animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-accent/80">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" /> A calmer way to move forward
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink md:text-6xl">
            <span className="text-ink">Map the way.</span>
            <br />
            Build the day.
          </h1>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
            Tell Kairo what you want done. It turns your goals, ideas, and available time into a clear plan for today.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-[#1b1206] transition-all hover:brightness-105"
            >
              Start building your day <ArrowRight size={18} />
            </Link>
            <a href="#how" className="inline-flex h-12 items-center gap-2 rounded-full border border-line px-6 text-[15px] text-ink transition-colors hover:bg-white/5">
              See how it works
            </a>
          </div>
        </div>

        {/* Hero living map */}
        <div className="relative animate-fade-in">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-accent/10 blur-[100px]" />
          <div className="panel relative overflow-hidden rounded-[28px] p-3">
            <div className="pointer-events-none absolute inset-0 grid-veil opacity-40" />
            <div className="pointer-events-none relative">
              <LivingGoalMap goal={goal} />
            </div>
            <div className="pointer-events-none absolute left-5 top-5 rounded-xl border border-line bg-canvas/70 px-3 py-2 backdrop-blur">
              <div className="font-mono text-[10px] uppercase tracking-wide text-faint">Now mapping</div>
              <div className="text-sm font-medium text-ink">{goal.title}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel rounded-3xl p-8">
            <SectionLabel className="mb-3 text-warn/70">The problem</SectionLabel>
            <p className="font-display text-2xl font-medium leading-snug text-ink">
              Your goals are scattered. Your day is busy. Your planner doesn't know what actually matters.
            </p>
          </div>
          <div className="panel rounded-3xl p-8">
            <SectionLabel className="mb-3 text-accent/70">The solution</SectionLabel>
            <p className="font-display text-2xl font-medium leading-snug text-ink">
              Kairo turns goals into maps, maps into next steps, and next steps into today's plan.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 text-center">
          <SectionLabel className="mb-3 flex justify-center">How it works</SectionLabel>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Four steps, every day.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="panel rounded-2xl p-6">
              <div className="font-mono text-2xl font-semibold text-accent/50">{s.n}</div>
              <h3 className="mt-3 font-display text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10">
          <SectionLabel className="mb-3">Everything in one calm surface</SectionLabel>
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            A command center for getting locked in — without the overwhelm.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="panel group rounded-2xl p-6 transition-all hover:border-line-strong">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-accent/20 bg-accent/5 text-accent transition-all">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 text-center">
          <SectionLabel className="mb-3 flex justify-center">Pricing</SectionLabel>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Start free. Upgrade when it's moving.</h2>
        </div>
        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
          <div className="panel rounded-3xl p-8">
            <div className="text-sm font-semibold text-muted">Free</div>
            <div className="mt-2 font-display text-4xl font-semibold text-ink">$0</div>
            <p className="mt-2 text-sm text-muted">2 active goals, daily planning, inbox, and simple review.</p>
            <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">
              Get started <ArrowRight size={15} />
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-accent/[0.06] p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
            <div className="text-sm font-semibold text-accent">Pro</div>
            <div className="mt-2 flex items-end gap-1">
              <span className="font-display text-4xl font-semibold text-ink">$8</span>
              <span className="mb-1.5 text-sm text-muted">/mo</span>
            </div>
            <p className="mt-2 text-sm text-muted">Unlimited goals, advanced AI planning, deeper reviews, forecasting.</p>
            <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink hover:underline">
              Start with Pro <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="panel-2 relative overflow-hidden rounded-[32px] px-8 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/20 blur-[90px]" />
          </div>
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            What's the best thing you can do with the time you have today?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">Kairo answers that every morning. Map the way. Build the day.</p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-semibold text-[#1b1206] transition-all hover:brightness-105"
          >
            Start building your day <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo size={22} />
          <p className="font-mono text-[12px] text-faint">Map the way. Build the day.</p>
          <div className="flex gap-5 text-sm text-muted">
            <Link href="/sign-in" className="hover:text-ink">Sign in</Link>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
