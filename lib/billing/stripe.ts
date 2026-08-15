import Stripe from "stripe";
import type { Tier } from "@/lib/tiers";

/**
 * Stripe wiring. Like the rest of the app, an unconfigured deployment still
 * boots — billing simply reports itself as unavailable rather than throwing
 * at import time.
 */

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  // No apiVersion pin: the SDK's own default always matches its types.
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/**
 * Price IDs live in the environment, and the mapping is only ever read
 * server-side. The client names a tier; it never names a price.
 */
export function priceFor(tier: Tier): string | null {
  if (tier === "pro") return proPriceId();
  return null;
}

/**
 * The configured price for the paid plan.
 *
 * `STRIPE_PRICE_PRO` is the name going forward; the two older names are still
 * accepted because live subscriptions are attached to those price objects and
 * a rename in this repo must not drop an existing subscriber to free.
 */
function proPriceId(): string | null {
  return (
    process.env.STRIPE_PRICE_PRO ||
    process.env.STRIPE_PRICE_PLUS ||
    process.env.STRIPE_PRICE_TRADER ||
    null
  );
}

/**
 * The reverse mapping, for reading a webhook back into a plan.
 *
 * Any price this deployment knows about means the paid plan — including the
 * two legacy ones, so a subscriber created before the plans were collapsed
 * keeps what they are paying for.
 */
export function tierForPrice(priceId: string | null | undefined): Tier {
  if (!priceId) return "free";
  const known = [
    process.env.STRIPE_PRICE_PRO,
    process.env.STRIPE_PRICE_PLUS,
    process.env.STRIPE_PRICE_TRADER,
  ].filter(Boolean);
  return known.includes(priceId) ? "pro" : "free";
}

/**
 * Absolute URLs for Checkout's return legs.
 *
 * `APP_URL` first, because that is the variable the rest of the app resolves
 * its origin from (`lib/origin.ts`). This read it last — in fact not at all —
 * so a deployment that set `APP_URL` and not `NEXT_PUBLIC_SITE_URL` sent every
 * paying customer back to `http://localhost:3000/profile` after checkout.
 */
export function siteUrl(): string {
  const raw =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
