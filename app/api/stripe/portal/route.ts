import { NextResponse } from "next/server";
import { features } from "@/lib/config";
import { ensureProfile } from "@/lib/data/profile";

// Stripe Billing Portal: lets a subscriber update their card, view invoices, or
// cancel. Requires the customer portal to be enabled once in the Stripe
// dashboard (Settings → Billing → Customer portal).
export async function POST(req: Request) {
  if (!features.stripe) {
    return NextResponse.json({ error: "Billing isn't configured yet." }, { status: 400 });
  }
  const profile = await ensureProfile();
  if (!profile) return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  if (!profile.stripeCustomerId) {
    return NextResponse.json({ error: "You don't have a subscription to manage yet." }, { status: 400 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${origin}/app/billing`,
      ...(process.env.STRIPE_PORTAL_CONFIG_ID ? { configuration: process.env.STRIPE_PORTAL_CONFIG_ID } : {}),
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe.portal]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not open the billing portal. Try again." }, { status: 500 });
  }
}
