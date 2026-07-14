import Link from "next/link";
import { ArrowRight, ChevronDown, Waypoints, Sunrise, CircleCheck, Search, Bell, ShieldCheck, Activity, Check } from "lucide-react";
import { Logo } from "@/components/kairo/Logo";
import { HeroCluster } from "@/components/kairo/HeroCluster";
import { SectionLabel } from "@/components/kairo/PageHeader";
import { Button } from "@/components/ui/Button";

// The three beats of the real loop — this IS a sequence, so numbering earns its place.
const BEATS = [
  { icon: Waypoints, k: "Map the goal", desc: "Tell Solaspace what you want done. It maps the whole path in about a minute, from milestones to your first move." },
  { icon: Sunrise, k: "Build your day", desc: "Give it the time and energy you actually have. It builds one calm, focused plan for today and keeps the goal moving." },
  { icon: CircleCheck, k: "Prove & arrive", desc: "Mark steps done with real proof. Reminders, weekly reports, and your true pace keep you honest all the way to the finish." },
];

// The four things Solaspace is built around.
const PILLARS = [
  { icon: Search, title: "Research, done for you", desc: "Each step pulls hand-checked videos and cited answers. Real links you can act on, never a dead or made-up one." },
  { icon: Bell, title: "Reminders that keep you moving", desc: "Calm nudges for what's due and what's next. Never noisy, never guilt. One thing to do today." },
  { icon: ShieldCheck, title: "Real accountability", desc: "Attach real proof to finished steps and share your progress. The map becomes a record of actual work, not just checkboxes." },
  { icon: Activity, title: "Progress you can see", desc: "A weekly report of what you produced and your true pace to every deadline. A clear picture, every week." },
];

const FREE = ["Up to 2 active goals", "AI goal maps & a daily focus plan", "Guidance and video picks for each step", "Proof of progress on completed steps", "Weekly progress review"];
const PRO = ["Unlimited goals", "Ask Sola for coaching on any step", "Deep research with cited sources", "Reminders & a weekly digest", "Accountability: share your progress", "Priority AI + much higher limits"];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line/50 bg-canvas/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-ink">Sign in</Link>
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

      {/* How it works — the loop */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <div className="mb-10">
          <SectionLabel className="mb-3">How it works</SectionLabel>
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">One loop, from a spark to done.</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">No setup, no columns to configure. Say the goal. Solaspace handles the mapping, the planning, and the follow-through with you.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {BEATS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={b.k} className="panel rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/20 bg-accent/5 text-accent"><Icon size={18} /></span>
                  <span className="font-mono text-[12px] font-semibold text-faint">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-display text-xl font-semibold text-ink">{b.k}</h3>
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* The four pillars */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10">
          <SectionLabel className="mb-3">Built to get you there</SectionLabel>
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">A guide that stays with you.</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">Most apps hand you a plan and walk away. Solaspace stays with you: research, reminders, proof, and an honest picture of where you stand.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="panel flex gap-4 rounded-2xl p-6 transition-all hover:border-line-strong">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/5 text-accent">
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{f.desc}</p>
                </div>
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
          <p className="mt-3 text-[14px] text-muted">Free to start · no credit card · cancel anytime.</p>
        </div>
        <div className="mx-auto grid max-w-3xl items-start gap-4 md:grid-cols-2">
          <div className="panel rounded-3xl p-8">
            <div className="text-sm font-semibold text-muted">Free</div>
            <div className="mt-2 font-display text-4xl font-semibold text-ink">$0</div>
            <p className="mt-2 text-sm text-muted">Everything you need to map a goal and start moving.</p>
            <ul className="mt-6 space-y-2.5">
              {FREE.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink/90"><Check size={15} className="mt-0.5 shrink-0 text-sage" />{f}</li>
              ))}
            </ul>
            <Link href="/onboarding" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">Get started <ArrowRight size={15} /></Link>
          </div>
          <div className="panel-2 relative overflow-hidden rounded-3xl border border-accent/25 p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
            <div className="flex items-center gap-2"><div className="text-sm font-semibold text-accent">Pro</div><span className="rounded-full bg-accent/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">Most popular</span></div>
            <div className="mt-2 flex items-end gap-1">
              <span className="font-display text-4xl font-semibold text-ink">$12</span>
              <span className="mb-1.5 text-sm text-muted">/mo</span>
            </div>
            <p className="mt-1 text-[13px] text-faint">or $96/yr, save 33%. Cents a day for a daily execution engine.</p>
            <p className="mt-2 text-sm text-muted">Everything in Free, plus the AI that does the work with you.</p>
            <ul className="mt-6 space-y-2.5">
              {PRO.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink"><Check size={15} className="mt-0.5 shrink-0 text-accent" />{f}</li>
              ))}
            </ul>
            <Link href="/onboarding" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-ink hover:underline">Start free, upgrade in-app <ArrowRight size={15} /></Link>
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
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">Chart it. Focus. Arrive. The first map takes about a minute. Free, no card.</p>
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
