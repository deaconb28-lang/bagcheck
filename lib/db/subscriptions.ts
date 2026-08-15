import { getCollections } from "./collections";
import { normaliseTier, tierFromStatus, type Tier } from "@/lib/tiers";
import { effectiveTier, trialState } from "@/lib/tiers";
import type { TrialState } from "@/lib/tiers";
import type { SubscriptionDoc } from "./types";

/**
 * The tier the app should act on: what Stripe last told us, downgraded to
 * free unless the subscription is currently live, then raised to the trial
 * tier while the reverse trial is running. Reads never trust a stored tier on
 * its own, and a paid plan always beats a trial.
 *
 * The trial clock starts at the brokerage connection rather than at signup,
 * because an account with no ledger has nothing to unlock.
 */
export async function tierFor(userId: string): Promise<Tier> {
  const { subscriptions, connections } = await getCollections();
  const [doc, connection] = await Promise.all([
    subscriptions.findOne({ userId }, { projection: { _id: 0, tier: 1, status: 1 } }),
    connections.findOne({ userId }, { projection: { _id: 0, createdAt: 1 } }),
  ]);
  const paid = doc ? tierFromStatus(normaliseTier(doc.tier), doc.status) : "free";
  return effectiveTier(paid, trialState(connection?.createdAt ?? null, new Date()));
}

/** The trial window itself, for the one line the plan card is allowed to say. */
export async function trialFor(userId: string): Promise<TrialState> {
  const { connections } = await getCollections();
  const connection = await connections.findOne(
    { userId },
    { projection: { _id: 0, createdAt: 1 } },
  );
  return trialState(connection?.createdAt ?? null, new Date());
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
