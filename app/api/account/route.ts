import { NextResponse } from "next/server";
import { getUserId, isDevIdentity } from "@/auth";
import { deleteAccount, isDbConfigured, subscriptionFor } from "@/lib/db";
import { isStripeConfigured, stripe } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Delete the account and everything under it.
 *
 * Two things happen in order and the order matters. A live Stripe
 * subscription is cancelled first, because deleting our mirror of it would
 * leave a subscription still billing that nobody in this product can see.
 * Then every collection keyed by this user is emptied, including the Auth.js
 * session and account records — so signing back in with the same Google
 * account starts from nothing rather than resurrecting half a profile.
 *
 * The development identity cannot delete: `DEV_USER_ID` is a shared stand-in
 * rather than a person, and an unauthenticated DELETE that empties it is the
 * one shape this route must not have.
 */
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (isDevIdentity()) {
    return NextResponse.json(
      { error: "the development identity cannot be deleted" },
      { status: 403 },
    );
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "ledger store not configured" }, { status: 503 });
  }

  let billing: string | null = null;
  if (isStripeConfigured()) {
    try {
      const sub = await subscriptionFor(userId);
      if (sub?.stripeSubscriptionId && sub.status !== "canceled") {
        await stripe().subscriptions.cancel(sub.stripeSubscriptionId);
        billing = "cancelled";
      }
    } catch (err) {
      /*
       * A failed cancel must not block the erasure — but it must be said,
       * because the person is owed the fact that their card may still be on
       * file at Stripe.
       */
      console.error("[account] subscription cancel failed", err);
      billing = "cancel-failed";
    }
  }

  const result = await deleteAccount(userId);
  return NextResponse.json({ deleted: result.deleted, total: result.total, billing });
}
