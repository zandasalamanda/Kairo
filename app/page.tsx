import Link from "next/link";
import { ArrowRight, ChevronDown, Waypoints, Sunrise, CircleCheck, Search, Bell, ShieldCheck, Activity, Check } from "lucide-react";
import { Logo } from "@/components/kairo/Logo";
import { AppShots } from "@/components/kairo/AppShots";
import { HeroSayItSeeIt } from "@/components/kairo/HeroSayItSeeIt";
import { Reveal } from "@/components/kairo/Reveal";
import { SectionLabel } from "@/components/kairo/PageHeader";
import { Button } from "@/components/ui/Button";
import { PLAN_FREE_FEATURES, PLAN_PRO_FEATURES, priceDisplay } from "@/lib/kairo/plans";

// The three beats of the real loop — this IS a sequence, so numbering earns its place.
const BEATS = [
  { icon: Waypoints, k: "Say the goal", desc: "Tell Solaspace what you want in plain words. It maps the whole path in about a minute, every step in the right order." },
  { icon: Sunrise, k: "Get your day", desc: "Say how much time and energy you have. It builds one focused plan for today, so you always know the very next move." },
  { icon: CircleCheck, k: "Follow and finish", desc: "Each step already has the video or guide you need. Reminders and a weekly report carry you all the way to done." },
];

// The four things Solaspace is built around.
const PILLARS = [
  { icon: Search, title: "Every resource, already found", desc: "Each step comes with the exact video or cited guide you need, found and laid out for you. No hunting, no dead links, no made-up sources." },
  { icon: Bell, title: "It keeps you moving", desc: "Calm reminders for what's due and what's next. Never noisy, never guilt. Just the one thing to do today." },
  { icon: ShieldCheck, title: "Real accountability", desc: "Share your progress and keep an honest record of what you actually finished, not just boxes ticked." },
  { icon: Activity, title: "Progress you can see", desc: "A weekly report of what you produced and your true pace to every deadline. A clear picture, every week." },
];

// Honest answers to the questions a first-time visitor actually asks.
const FAQS = [
  { q: "Do I need to be an expert to use it?", a: "No. Tell Solaspace your goal in plain words, and it handles the mapping, the order, and the research for each step, so you just follow the next move." },
  { q: "What powers the AI?", a: "Solaspace uses leading large language models to map your goals, break steps down, and draft alongside you. If AI is ever unavailable, it falls back to solid built-in plans so the app always works." },
  { q: "What happens to my data?", a: "Your goals and progress are yours. They're stored securely, never sold, and you can delete your account and all of your data anytime from Settings." },
  { q: "Is payment secure, and can I cancel?", a: "Payments run through Stripe, so we never see your card. Cancel in one click from Settings anytime; you keep Pro through the end of the period you paid for." },
  { q: "What if I fall behind?", a: "That's exactly what it's built for. Solaspace shows your true pace, reschedules what slipped, and rebuilds today around the time and energy you actually have." },
  { q: "Can I use it for free?", a: "Yes. The free plan maps up to two goals with daily planning, research picks, and a weekly review. Upgrade to Pro only when you want unlimited goals and the full AI." },
];

export default function LandingPage() {
  return (
    <div data-theme="dark" className="cockpit relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SoftwareApplication",
                name: "Solaspace",
                applicationCategory: "ProductivityApplication",
                operatingSystem: "Web",
                description: "An AI goal-execution app that turns your goals into a living map and builds the best plan for the time you actually have today.",
                offers: [
                  { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free" },
                  { "@type": "Offer", price: "10", priceCurrency: "USD", name: "Pro" },
                ],
              },
              {
                "@type": "FAQPage",
                mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
              },
            ],
          }),
        }}
      />
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

      {/* Hero — say it, see it: a real goal types itself, then its whole plan draws itself.
          Fully canned (no AI, no tokens); the CTA hands off to onboarding which gates sign-up. */}
      <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pb-16 pt-24">
        <HeroSayItSeeIt />
        <a href="#how" className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-faint transition-colors hover:text-muted" aria-label="Scroll to learn more">
          <ChevronDown size={22} className="animate-pulse-soft" />
        </a>
      </section>

      {/* How it works — the loop */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mb-10">
          <SectionLabel className="mb-3">How it works</SectionLabel>
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">You bring the goal. Solaspace does the rest.</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">No planning, no blank page, no figuring out where to start. Say what you want and Solaspace maps it, plans it, and walks you through every step.</p>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {BEATS.map((b, i) => {
            const Icon = b.icon;
            return (
              <Reveal key={b.k} className="panel rounded-2xl p-6" delay={i * 90}>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/20 bg-accent/5 text-accent"><Icon size={18} /></span>
                  <span className="font-mono text-[12px] font-semibold text-faint">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-display text-xl font-semibold text-ink">{b.k}</h3>
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">{b.desc}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* The real app — the legible proof, right after the plain-words setup */}
      <section id="app" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mb-10 text-center">
          <SectionLabel className="mb-3 flex justify-center">A look inside</SectionLabel>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">See exactly what you get.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">Every screen below explains itself. Follow the cursor.</p>
        </Reveal>

        <Reveal><AppShots /></Reveal>
      </section>

      {/* The four pillars — the trust close-out after the proof */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mb-10">
          <SectionLabel className="mb-3">Built to get you there</SectionLabel>
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">A guide that holds your hand the whole way.</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">Most apps hand you a plan and walk away. Solaspace stays with you: it does the research, lays out every step, sends the reminders, and shows exactly where you stand.</p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} className="panel flex gap-4 rounded-2xl p-6 transition-all hover:border-line-strong hover:-translate-y-0.5" delay={i * 80}>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/5 text-accent">
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{f.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mb-10 text-center">
          <SectionLabel className="mb-3 flex justify-center">Pricing</SectionLabel>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Start free. Upgrade when it&apos;s moving.</h2>
          <p className="mt-3 text-[14px] text-muted">Free to start · no credit card · cancel anytime.</p>
        </Reveal>
        <div className="mx-auto grid max-w-3xl items-start gap-4 md:grid-cols-2">
          <div className="panel rounded-3xl p-8">
            <div className="text-sm font-semibold text-muted">Free</div>
            <div className="mt-2 font-display text-4xl font-semibold text-ink">$0</div>
            <p className="mt-2 text-sm text-muted">Everything you need to map a goal and start moving.</p>
            <ul className="mt-6 space-y-2.5">
              {PLAN_FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink/90"><Check size={15} className="mt-0.5 shrink-0 text-sage" />{f}</li>
              ))}
            </ul>
            <Link href="/onboarding" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">Get started <ArrowRight size={15} /></Link>
          </div>
          <div className="panel-2 relative overflow-hidden rounded-3xl border border-accent/25 p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 animate-pulse-soft rounded-full bg-accent/20 blur-3xl" />
            <div className="flex items-center gap-2"><div className="text-sm font-semibold text-accent">Pro</div><span className="rounded-full bg-accent/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">Most popular</span></div>
            <div className="mt-2 flex items-end gap-1.5">
              <span className="font-display text-4xl font-semibold text-ink">${priceDisplay.monthly}</span>
              <span className="mb-1.5 text-sm text-muted">/mo</span>
            </div>
            <p className="mt-1 text-[13px] text-faint">or ${priceDisplay.yearly}/year · save {priceDisplay.savingsPct}%</p>
            <p className="mt-2 text-sm text-muted">Everything in Free, plus the full AI that does the heavy lifting on every goal.</p>
            <ul className="mt-6 space-y-2.5">
              {PLAN_PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink"><Check size={15} className="mt-0.5 shrink-0 text-accent" />{f}</li>
              ))}
            </ul>
            <Link href="/onboarding" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-ink hover:underline">Start free, upgrade in-app <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
        <Reveal className="mb-8 text-center">
          <SectionLabel className="mb-3 flex justify-center">Questions</SectionLabel>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Good questions, honest answers.</h2>
        </Reveal>
        <div className="space-y-2.5">
          {FAQS.map((f) => (
            <details key={f.q} className="panel group rounded-2xl px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={18} className="shrink-0 text-faint transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative mx-auto max-w-6xl overflow-hidden px-5 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 animate-breathe rounded-full bg-accent/15 blur-[90px]" />
        </div>
        <Reveal>
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">Become who you keep meaning to be.</h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-muted">Pick one goal. Solaspace maps the way, lays out every step, and walks you there.</p>
          <Link href="/onboarding" className="mt-8 inline-block">
            <Button variant="primary" size="lg">Start your map <ArrowRight size={18} /></Button>
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 pt-8 sm:flex-row">
          <Logo size={22} />
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted">
            <Link href="/sign-in" className="inline-block py-1.5 hover:text-ink">Sign in</Link>
            <a href="#features" className="inline-block py-1.5 hover:text-ink">Features</a>
            <a href="#pricing" className="inline-block py-1.5 hover:text-ink">Pricing</a>
            <a href="#faq" className="inline-block py-1.5 hover:text-ink">FAQ</a>
            <Link href="/privacy" className="inline-block py-1.5 hover:text-ink">Privacy</Link>
            <Link href="/terms" className="inline-block py-1.5 hover:text-ink">Terms</Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-3 text-center sm:text-left">
          <p className="font-mono text-[12px] text-faint">© 2026 Solaspace · Chart it. Focus. Arrive.</p>
        </div>
      </footer>
    </div>
  );
}
