import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { features } from "@/lib/config";
import { getSupabaseServer } from "@/lib/supabase/server";

// Subscription sync: verify the signature, then flip the user's plan in Supabase
// via a SECURITY DEFINER RPC (no service-role key needed). checkout.session tags
// the user with client_reference_id / metadata.profileId so we can map it back.
async function applyPlan(profileId: string | null | undefined, plan: "free" | "pro", status: string, customer?: string | null, price?: string | null) {
  const supabase = getSupabaseServer();
  if (!supabase || !profileId) return;
  await supabase.rpc("apply_subscription", {
    p_profile_id: profileId,
    p_plan: plan,
    p_status: status,
    p_customer: customer ?? null,
    p_price: price ?? null,
  });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!features.stripe || !secret) {
    return NextResponse.json({ received: true, note: "webhook not configured" });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const StripeCtor = (await import("stripe")).default;
  const stripe = new StripeCtor(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const profileId = s.client_reference_id ?? (s.metadata?.profileId as string | undefined);
      const customer = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
      await applyPlan(profileId, "pro", "active", customer);
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const profileId = sub.metadata?.profileId as string | undefined;
      const live = event.type !== "customer.subscription.deleted" && (sub.status === "active" || sub.status === "trialing");
      const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
      const price = sub.items?.data?.[0]?.price?.id ?? null;
      await applyPlan(profileId, live ? "pro" : "free", sub.status, customer, price);
    }
    return NextResponse.json({ received: true, type: event.type });
  } catch {
    return NextResponse.json({ received: true, error: "handler error" });
  }
}
