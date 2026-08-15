import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { isDbConfigured, subscriptionFor } from "@/lib/db";
import { isStripeConfigured, isTier, priceFor, siteUrl, stripe } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Start a Stripe Checkout session.
 *
 * The client names a tier and never a price: the tier -> price mapping is
 * read from the environment on this side, so a crafted request cannot buy a
 * price we did not offer.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (!isStripeConfigured() || !isDbConfigured()) {
    return NextResponse.json({ error: "billing is not configured" }, { status: 503 });
  }

  let tier: unknown;
  try {
    tier = (await req.json())?.tier;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!isTier(tier) || tier === "free") {
    return NextResponse.json({ error: "unknown tier" }, { status: 400 });
  }

  const price = priceFor(tier);
  if (!price) {
    return NextResponse.json(
      { error: `no price configured for ${tier}` },
      { status: 503 },
    );
  }

  // Reuse the customer if this person has subscribed before, so their
  // billing history stays on one record.
  const existing = await subscriptionFor(userId);
  const base = siteUrl();

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(existing?.stripeCustomerId
      ? { customer: existing.stripeCustomerId }
      : { customer_creation: "always" }),
    // Both of these carry our identity back: the first on the session, the
    // second onto every subscription.* event the subscription later emits.
    client_reference_id: userId,
    subscription_data: { metadata: { userId } },
    success_url: `${base}/profile?checkout=done`,
    cancel_url: `${base}/profile?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json({ error: "checkout could not start" }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
