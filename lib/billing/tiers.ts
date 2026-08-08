/**
 * What a tier buys — pure, no Stripe, no I/O.
 *
 * The product's promise is that sharing is never paywalled and rarity is
 * never sold. That is enforced structurally here: `Feature` contains no
 * member for minting a card or for rarity, so there is no way to write a
 * gate against them. Paid tiers unlock *formats*, and nothing else.
 */

export type Tier = "free" | "plus" | "trader";

export type Feature =
  /** Plus — depth for people who write. */
  | "reportCarousel"
  | "correlationCard"
  | "publicationExport"
  | "embed"
  | "liveBadge"
  /** Trader — cadence and proof. */
  | "sessionRecapCard"
  | "motionExport"
  | "verifiedTrackRecord";

const PLUS: Feature[] = [
  "reportCarousel",
  "correlationCard",
  "publicationExport",
  "embed",
  "liveBadge",
];

const TRADER: Feature[] = [
  ...PLUS,
  "sessionRecapCard",
  "motionExport",
  "verifiedTrackRecord",
];

const BY_TIER: Record<Tier, Feature[]> = {
  free: [],
  plus: PLUS,
  trader: TRADER,
};

export function features(tier: Tier): Feature[] {
  return BY_TIER[tier];
}

export function can(tier: Tier, feature: Feature): boolean {
  return BY_TIER[tier].includes(feature);
}

/**
 * Every tier can mint every card its behaviour has earned, including rare
 * ones. This takes no tier on purpose — a caller cannot accidentally gate it.
 */
export function canMintCards(): true {
  return true;
}

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  plus: "Plus",
  trader: "Trader",
};

/** A subscription only entitles anything while Stripe says it is live. */
const LIVE = new Set(["active", "trialing"]);

export function tierFromStatus(tier: Tier, status: string | null): Tier {
  return status && LIVE.has(status) ? tier : "free";
}

export function isTier(value: unknown): value is Tier {
  return value === "free" || value === "plus" || value === "trader";
}
