// Billing. Plans live in lib/tiers.ts; stripe.ts is the only part that talks
// to Stripe.
export { isStripeConfigured, priceFor, siteUrl, stripe, tierForPrice } from "./stripe";
export { isTier, normaliseTier } from "@/lib/tiers";
export type { Tier } from "@/lib/tiers";
