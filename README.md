# Solaspace

**Map the way. Build the day.**

A minimalist but visually rich, AI-powered execution app. Tell Solaspace what you want done and how much time and energy you have — it turns messy goals into a living map and builds the most efficient plan for today.

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS v4 · Supabase · Clerk · Stripe (test mode) · Vercel.

## Runs with zero keys

Every integration degrades gracefully. With **no** environment variables set, Solaspace runs in **demo mode** — seeded data, demo auth, and deterministic AI mocks — so it's fully explorable and deployable to a Vercel preview. Add keys (see `.env.example`) to light up real auth, database, payments, and AI.

## Scripts

```bash
npm run dev         # local dev
npm run typecheck   # strict TS
npm run build       # production build
npm run test        # vitest
npm run lint        # eslint
```

## Structure

```
app/                 routes: / (landing), /sign-in, /sign-up, /onboarding,
                     /app/{today,map,inbox,review,settings,billing}, /api/stripe/*
components/ui        primitives (Button, Input, StatusBadge, …)
components/kairo     signature pieces (LivingGoalMap, GoalCore, TodayBuilder, …)
components/layout    KairoShell, Sidebar, BottomNav, TopBar
lib/ai               AI abstraction (goal map, daily plan, inbox sort, review) + mocks
lib/data             data-access seam (Supabase drops in here)
lib/{auth,config}    auth + feature flags
types                domain model
```

## Definition of done

typecheck ✓ · build ✓ · tests ✓ · works in app ✓ · working Vercel preview URL. See `CLAUDE.md` for full conventions and roadmap.
