import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { saveSubscription, userIdForCustomer } from "@/lib/db";
import { isStripeConfigured, stripe, tierForPrice } from "@/lib/billing";

export const runtime = "nodejs";
// Signature verification runs over the exact bytes Stripe signed, so this
// route must never be cached or statically analysed into one.
export const dynamic = "force-dynamic";

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

const idOf = (v: string | { id: string } | null | undefined): string | null =>
  typeof v === "string" ? v : (v?.id ?? null);

/**
 * Mirror one subscription into our store.
 *
 * `current_period_end` sits on the subscription *item* in API version
 * 2026-07-29.dahlia — it is no longer a field on the subscription itself.
 */
async function mirror(sub: Stripe.Subscription, fallbackUserId?: string | null) {
  const customerId = idOf(sub.customer);
  if (!customerId) return;

  const userId =
    sub.metadata?.userId || fallbackUserId || (await userIdForCustomer(customerId));
  if (!userId) {
    console.error("[billing] no userId for customer", customerId);
    return;
  }

  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end ?? null;

  await saveSubscription(userId, {
    tier: tierForPrice(item?.price?.id),
    status: sub.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  });
}

export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "billing is not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "unsigned" }, { status: 400 });

  // The raw body, byte for byte. Parsing it first would break the signature.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(
      raw,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    // A bad signature is the one case that must never reach the handlers:
    // anything can POST here, only Stripe can sign.
    console.error("[billing] signature verification failed", err);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) {
    // Acknowledge anything else so Stripe stops retrying it.
    return NextResponse.json({ received: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const subId = idOf(session.subscription);
      // The session carries our userId; the subscription carries the price.
      if (subId) {
        const sub = await stripe().subscriptions.retrieve(subId);
        await mirror(sub, session.client_reference_id);
      }
    } else {
      await mirror(event.data.object as Stripe.Subscription);
    }
  } catch (err) {
    // 500 tells Stripe to retry. Every handler above is an upsert keyed by
    // userId, so a redelivery is safe.
    console.error("[billing] handler failed", event.type, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
