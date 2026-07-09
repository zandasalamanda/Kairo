"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import posthog from "posthog-js";

// Traffic + web-vitals via Vercel (zero-config). Product funnel via PostHog —
// only initialized when NEXT_PUBLIC_POSTHOG_KEY is set, so it's a no-op until
// you add a key. Pageviews are captured manually on route change.
let phReady = false;
const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (PH_KEY && !phReady) {
      posthog.init(PH_KEY, { api_host: PH_HOST, capture_pageview: false, person_profiles: "identified_only" });
      phReady = true;
    }
  }, []);

  useEffect(() => {
    if (phReady && pathname) posthog.capture("$pageview", { path: pathname });
  }, [pathname]);

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
