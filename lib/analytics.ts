import posthog from "posthog-js";

/**
 * Fire a product-funnel event. No-ops on the server and whenever PostHog isn't
 * configured (NEXT_PUBLIC_POSTHOG_KEY unset), so call sites can be unconditional.
 * Funnel: landing → sign_up → goal_created → focus_started → checkout_started → (Stripe) upgraded.
 */
export function track(event: string, props?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.capture(event, props);
  } catch {
    /* analytics must never break the app */
  }
}
