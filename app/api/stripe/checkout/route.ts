import { NextResponse } from "next/server";
import { features, pricing } from "@/lib/config";
import { ensureProfile } from "@/lib/data/profile";

export async function POST(req: Request) {
  if (!features.stripe) {
    return NextResponse.json({ error: "Billing isn't configured yet. Add STRIPE_SECRET_KEY + price IDs to enable checkout." }, { status: 400 });
  }
  const profile = await ensureProfile();
  if (!profile) return NextResponse.json({ error: "Sign in to upgrade." }, { status: 401 });
  // Already Pro? Don't let a direct POST create a second (double-billed) subscription.
  if (profile.plan === "pro") {
    return NextResponse.json({ error: "You're already on Pro — manage your plan from the billing portal.", alreadyPro: true }, { status: 400 });
  }

  const { interval } = (await req.json().catch(() => ({}))) as { interval?: "monthly" | "yearly" };
  const priceId = interval === "yearly" ? pricing.yearly.priceId : pricing.monthly.priceId;

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      // tag the user so the webhook can map the subscription back to their profile
      client_reference_id: profile.id,
      metadata: { profileId: profile.id },
      subscription_data: { metadata: { profileId: profile.id } },
      allow_promotion_codes: true,
      // reuse the existing Stripe customer so upgrades never create duplicates
      ...(profile.stripeCustomerId
        ? { customer: profile.stripeCustomerId }
        : { customer_email: profile.email || undefined }),
      success_url: `${origin}/app/billing?status=success`,
      cancel_url: `${origin}/app/billing?status=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe.checkout]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Checkout is temporarily unavailable — please try again shortly." }, { status: 500 });
  }
}
