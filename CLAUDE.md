# CLAUDE.md — Solaspace

Guidance for Claude Code working in this repository. These instructions override default behavior.

---

## What Solaspace is

Solaspace is a minimalist but visually rich, AI-powered **execution** app.

> **Tell Solaspace what you want done. Tell it your time and energy. It maps the way and builds your day.**

Tagline: **Map the way. Build the day.** ("Solaspaces" = the right, opportune moment.)

Users create goals; Solaspace turns each into a **living goal map**; every morning the user gives Solaspace their available time + energy, and Solaspace builds the most efficient plan for today and keeps the goal moving. Every day the app answers one question: **What is the best thing I can do with the time I actually have today?**

**It IS:** a calm AI execution assistant · a living goal map · a daily efficiency scheduler · a futuristic personal command center · minimal but beautiful.

**It is NOT:** a habit tracker · a task manager · a Notion clone · a calendar app · a productivity dashboard · a generic AI chatbot · a gamified RPG · an XP/coin/rank system · a fitness app · a bland white mind-map app.

**Status:** Greenfield. Nothing is scaffolded yet — no `package.json`, not a git repo. Early work must bootstrap the Next.js app, then follow the phased roadmap below.

---

## Design & UI — read this before building any visual

- **There is NO Figma. Never ask for a Figma link or file.**
- **Invoke the `/frontend-design` skill for ALL visual building** — every time you create or refine UI, screens, components, layout, motion, or styling. It is the design source and direction. Combine it with the **Visual Direction** section below.
- The visual identity is **premium dark by default**: deep charcoal / black / dark navy, subtle gradient surfaces, floating glass panels, soft blurred glows, luminous nodes, animated-looking connection lines, 3D orb-like goal cores, depth shadows, glowing focus states, minimal typography, spacious layouts, high contrast, premium motion cues.
- **Minimal layout, maximal focal points.** Feels like: futuristic AI command center · Apple Vision Pro depth · Arc Browser polish · premium 3D app-icon aesthetic · calm but visually exciting.
- **Signature system = the living goal map:** glowing 3D nodes, floating orb goal cores, curved animated connection lines, soft pulse on the current next step, dimmed inactive branches, status halos, subtle parallax/depth — clarity, not messy spiderwebs.
- **Accents (use sparingly, premium not neon):** electric blue, cyan, violet, soft green, amber, white glow.
- **Never:** plain white backgrounds · flat-cards-only · generic SaaS dashboard · basic checklist · boring progress bars · childish/game visuals · badges/ranks/coins/XP · random AI-sparkle icons · purple-gradient overload · cluttered node maps.
- **Mobile-first.** Mobile = bottom nav (Today · Map · Inbox · Review). Desktop = sidebar layout.

The bar: the app must feel premium from the first screen. No generic placeholder UI, no bland white screens.

---

## Tech stack

- **Next.js (App Router) + TypeScript (strict)**
- **Tailwind CSS** for all styling
- **Supabase** — database / backend data, with RLS
- **Clerk** — authentication
- **Stripe (TEST mode)** — payments / subscriptions
- **Vercel** — deploy to **preview**

---

## Commands

```bash
npm run dev          # local dev server
npm run typecheck    # strict TS — must pass
npm run build        # production build — must pass
npm run test         # unit/component tests — must pass
npm run lint         # lint
```

Add these scripts when scaffolding. Prefer the `preview_*` tools (not Bash) to run/verify the dev server and confirm changes in-browser.

---

## Definition of Done — applies to ANY feature

A feature is **not done** until ALL of the following are true:

1. `typecheck` passes
2. `build` passes
3. `test` passes
4. The feature actually **works in the app**
5. A **working Vercel preview URL exists**

**Never claim deployment is complete without a working preview URL.** Report outcomes faithfully — if a check fails or a step was skipped, say so.

---

## Conventions

- **Server Components by default.** Use Client Components (`'use client'`) only when genuinely needed (interactivity, browser APIs, hooks, event handlers).
- **Strict TypeScript** — no `any` escape hatches without cause; type AI outputs and DB rows.
- **Tailwind** for styling — no ad-hoc CSS files unless a Tailwind approach can't express it.
- **Colocate tests** next to the code they cover where reasonable.
- **AI outputs are structured JSON** — validate/parse defensively; unit-test the parsers and mock generators.

### Secrets & environment

- **No secrets in code. No hardcoded API keys.** Every key comes from an environment variable.
- **Never commit secrets.** Service-role keys are server-side only.

---

## Working agreements

- **Use plan mode for multi-file changes.** Propose architecture → file structure → schema → phases, then wait for approval unless told to continue.
- Build in **phases**; each phase ends at a **runnable, committable checkpoint**.
- **Use subagents in parallel where useful:** a frontend subagent (UI/screens/components, driven by `/frontend-design`), a backend subagent (Supabase schema, RLS, server actions), a payments subagent (Stripe test mode), a QA subagent (tests/typecheck/build/deploy readiness).

---

## Architecture

### Routes

```
/                 landing (marketing)
/sign-in          Clerk
/sign-up          Clerk
/app              protected shell → redirects to /app/today
/app/today        Today (build the day)          ← most important screen
/app/map          Map (living goal map)          ← signature screen
/app/inbox        Inbox (idea dump + AI sort)
/app/review       Review (what changed / next best move)
/app/settings     Settings
/app/billing      Billing / Upgrade (Stripe test)
```

Authenticated users land on `/app/today`. App routes under `/app` are protected by Clerk.

### Directory structure

```
app/(marketing)   app/(auth)   app/(app)
components/ui      components/layout      components/kairo
lib/supabase      lib/clerk      lib/stripe      lib/ai
types
```

### Key components

`KairoShell`, `BottomNav`, `GoalCore`, `GoalCard`, `GoalNode`, `LivingGoalMap`, `TodayBuilder`, `EnergySelector`, `TimeBudgetSelector`, `DailyPlanBlock`, `InboxItem`, `InboxSorter`, `ReviewSummary`, `StatusBadge`, `ProgressHalo`, `SoftGlassCard`, `NodeConnection`, `EmptyState`, `CommandInput`, `GlowButton`, `OrbBackground`, `FocusPulse`. UI primitives: Button, Card, Input, Textarea, Select, Badge, Tabs, Modal, Toast, Skeleton, Dropdown.

---

## Data model (Supabase)

Create tables **with RLS** so users can only access their own data. Condensed schema:

- **users_profile** — `id, clerk_user_id, email, display_name, stripe_customer_id, subscription_status, subscription_price_id, plan, created_at, updated_at`
- **goals** — `id, user_id, title, description, status, progress, target_date, created_at, updated_at, archived_at` · user has many goals
- **goal_nodes** — `id, goal_id, parent_id?, title, description, status, progress, priority, estimated_minutes, due_date, position_x?, position_y?, ai_reason, created_at, updated_at` · goal has many nodes; node may have a parent node
- **inbox_items** — `id, user_id, content, category, source, converted_goal_id?, converted_node_id?, created_at, updated_at, archived_at`
- **daily_plans** — `id, user_id, plan_date, available_minutes, energy_level, context, summary, created_at, updated_at`
- **daily_plan_blocks** — `id, daily_plan_id, goal_id?, node_id?, title, description, start_time?, end_time?, duration_minutes, status, reason, difficulty, sort_order, created_at, updated_at`
- **reviews** — `id, user_id, goal_id?, review_type, summary, changes, risks, recovery_plan, created_at`
- **ai_events** — `id, user_id, event_type, input, output, model, created_at`

**Enums / statuses:**
- goal_node status: `Not Started · In Motion · Blocked · At Risk · Done`
- daily_plan_block status: `planned · in_progress · completed · pushed · skipped`
- inbox category: `unsorted · must_do · high_impact · quick_win · can_wait · not_worth_doing`

---

## AI layer

Abstraction layer under `lib/ai/`:

- `generate-goal-map.ts` → `{ title, description, suggested target date, nodes, first next action, weekly rhythm }`
- `build-daily-plan.ts` → `{ summary, blocks, explanation, recovery note? }`
- `sort-inbox.ts` → `{ categorized items, reasoning }`
- `generate-review.ts` → `{ what changed, risks, recoverability, next best move }`

**Rules:**
- **All AI output is structured JSON.**
- **If no AI key is configured, use deterministic mock outputs** so the app fully works in preview.
- Behavior: practical, concise, clear. **No** cheesy motivation, vague advice, hallucinated calendar data, medical/legal/financial claims, or guaranteed outcomes. If unsure, ask the user for more context.

Task actions on plan blocks: **Start · Complete · Push Later · Make Smaller · Split · Replace**, plus **Rebuild Today**. Push Later marks `pushed` + shows a timeline-impact message; Complete updates related node progress; Replace adapts to energy/time.

---

## Brand voice

**Tone:** calm · focused · intelligent · premium · direct · minimal · modern · useful · slightly motivational (never cheesy).

**Use these words:** next move · today's path · focus block · in motion · recoverable · rebuild today · map the way · available time · high-impact task · plan updated · locked in · focus path · living map.

**Avoid:** hustle language · "crush your goals" · "grind harder" · "rank up" · "level up" · XP · coins · boss fights · fantasy language · childish motivation.

---

## Environment variables

Set all of these in the environment (never in code):

- Clerk publishable + secret keys
- `NEXT_PUBLIC_SUPABASE_URL`, Supabase anon key, Supabase service-role key (server-side only)
- Stripe secret key, Stripe webhook secret, Stripe price IDs
- AI provider key (optional — falls back to mocks)

**Pricing (Stripe TEST mode):** Free = 2 active goals, basic maps, daily planning, inbox, simple review. Pro (~$8/mo, $60/yr) = unlimited goals, advanced AI planning, deeper reviews, AI sorting, timeline forecasting, custom planning styles. Use Stripe Checkout in test mode + webhook to sync subscription status.

---

## Roadmap (phased; each ends at a runnable checkpoint)

1. **Foundation** — app shell, routing, Tailwind design system, base UI, landing page, protected layout, Clerk auth. *→ user can sign in and reach the app shell.*
2. **Supabase schema** — tables, RLS, client/server helpers. *→ authed users can CRUD their own goals.*
3. **Goal creation + living map** — onboarding, first goal, AI/mock map generation, map UI, node editing. *→ user sees a glowing living map.*
4. **Today builder** — time budget, energy, context, AI/mock daily plan, plan blocks, task actions. *→ user builds a daily plan.*
5. **Inbox** — add items, AI/mock sort, convert to goal node / today task. *→ ideas become organized categories.*
6. **Review** — change summary, trajectory logic, recovery suggestions, rebuild plan. *→ user recovers from pushed tasks.*
7. **Stripe test mode** — billing screen, Checkout, webhook, subscription sync. *→ test subscription flow works.*
8. **Polish + QA + deploy** — responsive/empty/loading/error states, a11y pass, tests, typecheck, build, Vercel preview. *→ working Vercel preview URL.*
