import { getCollections } from "./collections";
import { tierFromStatus, type Tier } from "@/lib/billing/tiers";
import type { SubscriptionDoc } from "./types";

/**
 * The tier the app should act on: what Stripe last told us, downgraded to
 * free unless the subscription is currently live. Reads never trust a stored
 * tier on its own.
 */
export async function tierFor(userId: string): Promise<Tier> {
  const { subscriptions } = await getCollections();
  const doc = await subscriptions.findOne(
    { userId },
    { projection: { _id: 0, tier: 1, status: 1 } },
  );
  if (!doc) return "free";
  return tierFromStatus(doc.tier, doc.status);
}

export async function subscriptionFor(userId: string): Promise<SubscriptionDoc | null> {
  const { subscriptions } = await getCollections();
  return subscriptions.findOne({ userId });
}

/** Stripe is the source of truth; this only mirrors it. Idempotent by userId. */
export async function saveSubscription(
  userId: string,
  patch: Omit<SubscriptionDoc, "userId" | "updatedAt">,
): Promise<void> {
  const { subscriptions } = await getCollections();
  await subscriptions.updateOne(
    { userId },
    { $set: { ...patch, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true },
  );
}

/**
 * Subscription webhooks do not always carry our userId. When metadata is
 * missing we fall back to the customer we recorded at checkout.
 */
export async function userIdForCustomer(customerId: string): Promise<string | null> {
  const { subscriptions } = await getCollections();
  const doc = await subscriptions.findOne(
    { stripeCustomerId: customerId },
    { projection: { _id: 0, userId: 1 } },
  );
  return doc?.userId ?? null;
}
