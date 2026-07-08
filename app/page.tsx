import Link from "next/link";
import { ArrowRight, ChevronDown, Waypoints, Timer, PlayCircle, Gauge, Wand2, LayoutGrid } from "lucide-react";
import { Logo } from "@/components/kairo/Logo";
import { HeroCluster } from "@/components/kairo/HeroCluster";
import { SectionLabel } from "@/components/kairo/PageHeader";
import { Button } from "@/components/ui/Button";

const BEATS = [
  { k: "Chart it", desc: "Tell Solaspace a goal. It maps the whole path — milestones, concrete steps, and a finish line — in about a minute." },
  { k: "Focus", desc: "Run a calm focus session on the next step. Solaspace hands you a first move, a checklist sized to the session, and unblocks you when you stall." },
  { k: "Arrive", desc: "See your true pace to every deadline and adapt as life shifts — so the plan stays honest and you actually finish." },
];

const FEATURES = [
  { icon: Waypoints, title: "Living goal maps", desc: "Every goal becomes a planet with a branching path of steps. The next move glows; the rest waits." },
  { icon: Timer, title: "Working sessions", desc: "A calm timer that sits with you — a first move, a checklist for the session, and drafts it writes alongside you." },
  { icon: PlayCircle, title: "Real resources", desc: "Each step can pull a real, hand-checked video — never a dead link, never a hallucinated one." },
  { icon: Gauge, title: "The honest mirror", desc: "Not just what's done — whether you'll hit your deadline. Solaspace forecasts your pace and flags what's slipping." },
  { icon: Wand2, title: "A map that adapts", desc: "Ahead or stuck for weeks? Solaspace proposes an easier on-ramp or a new phase — you accept or dismiss." },
  { icon: LayoutGrid, title: "Start from a path", desc: "Adopt a proven starter goal in one tap, or share any map as a clean read-only link." },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line/50 bg-canvas/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="hidden rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-ink sm:block">Sign in</Link>
            <Link href="/onboarding"><Button variant="primary" size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero — the grand first screen: catchphrase + button over the planet cluster */}
      <section className="relative h-[100svh] min-h-[620px] overflow-hidden">
        <HeroCluster />
        <a href="#how" className="absolute bottom-7 left-1/2 z-20 -translate-x-1/2 text-faint transition-colors hover:text-muted" aria-label="Scroll to learn more">
          <ChevronDown size={22} className="animate-pulse-soft" />
        </a>
      </section>

      {/* How it works — the three beats of the catchphrase */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <div className="mb-10">
          <SectionLabel className="mb-3">How it works</SectionLabel>
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Three beats, from a spark to done.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {BEATS.map((b, i) => (
            <div key={b.k} className="panel rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full font-mono text-[12px] font-semibold text-accent" style={{ background: "rgba(230,184,119,0.12)" }}>{i + 1}</span>
                <h3 className="font-display text-xl font-semibold text-ink">{b.k}</h3>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10">
          <SectionLabel className="mb-3">What you get</SectionLabel>
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">A guide, not just a planner.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="panel rounded-2xl p-6 transition-all hover:border-line-strong">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-accent/20 bg-accent/5 text-accent">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 text-center">
          <SectionLabel className="mb-3 flex justify-center">Pricing</SectionLabel>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Start free. Upgrade when it&apos;s moving.</h2>
        </div>
        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
          <div className="panel rounded-3xl p-8">
            <div className="text-sm font-semibold text-muted">Free</div>
            <div className="mt-2 font-display text-4xl font-semibold text-ink">$0</div>
            <p className="mt-2 text-sm text-muted">A couple of active goals, focus sessions, real resources, and the pace mirror.</p>
            <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">Get started <ArrowRight size={15} /></Link>
          </div>
          <div className="panel-2 relative overflow-hidden rounded-3xl border border-accent/25 p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
            <div className="text-sm font-semibold text-accent">Pro</div>
            <div className="mt-2 flex items-end gap-1">
              <span className="font-display text-4xl font-semibold text-ink">$8</span>
              <span className="mb-1.5 text-sm text-muted">/mo</span>
            </div>
            <p className="mt-2 text-sm text-muted">Unlimited goals, the adapting map, co-written drafts, and a weekly pace digest.</p>
            <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink hover:underline">Start with Pro <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="panel-2 relative overflow-hidden rounded-[32px] px-8 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/20 blur-[90px]" />
          </div>
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">Pick a goal. Watch the path appear.</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">Chart it. Focus. Arrive. The first map takes about a minute.</p>
          <Link href="/onboarding" className="mt-8 inline-block">
            <Button variant="primary" size="lg">Start your map <ArrowRight size={18} /></Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo size={22} />
          <p className="font-mono text-[12px] text-faint">Chart it. Focus. Arrive.</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted">
            <Link href="/sign-in" className="hover:text-ink">Sign in</Link>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
