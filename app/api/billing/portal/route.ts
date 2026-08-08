import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { isDbConfigured, subscriptionFor } from "@/lib/db";
import { isStripeConfigured, siteUrl, stripe } from "@/lib/billing";

export const runtime = "nodejs";

/** Stripe's own billing portal — cancelling and card changes live there. */
export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (!isStripeConfigured() || !isDbConfigured()) {
    return NextResponse.json({ error: "billing is not configured" }, { status: 503 });
  }

  const sub = await subscriptionFor(userId);
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: "nothing to manage yet" }, { status: 422 });
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${siteUrl()}/profile`,
  });
  return NextResponse.json({ url: session.url });
}
