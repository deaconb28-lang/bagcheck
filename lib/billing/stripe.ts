import Stripe from "stripe";
import type { Tier } from "./tiers";

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
  if (tier === "plus") return process.env.STRIPE_PRICE_PLUS || null;
  if (tier === "trader") return process.env.STRIPE_PRICE_TRADER || null;
  return null;
}

/** The reverse mapping, for reading a webhook back into a tier. */
export function tierForPrice(priceId: string | null | undefined): Tier {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PLUS) return "plus";
  if (priceId === process.env.STRIPE_PRICE_TRADER) return "trader";
  return "free";
}

/** Absolute URLs for Checkout's return legs. */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
