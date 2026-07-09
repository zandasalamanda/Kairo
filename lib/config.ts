// Central place to read environment + feature flags.
// Every integration degrades gracefully when its keys are absent so the
// app is fully runnable (and deployable to a Vercel preview) with no secrets.

function has(...keys: string[]): boolean {
  return keys.every((k) => {
    const v = process.env[k];
    return typeof v === "string" && v.length > 0;
  });
}

export const features = {
  clerk: has("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"),
  supabase: has("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  stripe: has("STRIPE_SECRET_KEY"),
  ai: has("AI_API_KEY") || has("OPENAI_API_KEY") || has("GEMINI_API_KEY"),
  email: has("RESEND_API_KEY"),
};

/** True when nothing external is wired — the app runs on seeded demo data. */
export const isDemoMode = !features.clerk && !features.supabase;

/** Client-safe Clerk check (the secret key isn't exposed to the browser). */
export const clerkPublic = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const pricing = {
  currency: "usd",
  monthly: { amount: 8, priceId: process.env.STRIPE_PRICE_MONTHLY ?? "price_monthly_test" },
  yearly: { amount: 60, priceId: process.env.STRIPE_PRICE_YEARLY ?? "price_yearly_test" },
} as const;

export const planLimits = {
  free: { activeGoals: 2, label: "Free" },
  pro: { activeGoals: Infinity, label: "Pro" },
} as const;
