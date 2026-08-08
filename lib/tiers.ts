/**
 * What a tier buys — pure, no Stripe, no I/O.
 *
 * Gating lives here and nowhere else. Components ask `can()`; no component
 * reads `user.tier` directly, so there is exactly one place to audit and
 * exactly one place a mistake can be made.
 *
 * The product's promise is that sharing is never paywalled and rarity is
 * never sold, and that is enforced structurally rather than by discipline:
 * `Capability` contains no member for minting a card, for rarity, or for
 * sharing one, so a gate against them cannot be written. Paid tiers unlock
 * *categories and formats*, and nothing else.
 */

export type Tier = "free" | "plus" | "trader";

export type Capability =
  /** Plus — depth for people who write. */
  | "reportCarousel"
  | "correlationCard"
  | "publicationExport"
  | "transparentExport"
  | "embed"
  | "liveBadge"
  | "eventSegments"
  /** Trader — cadence and proof. */
  | "sessionRecapCard"
  | "setupPerformance"
  | "motionExport"
  | "verifiedTrackRecord"
  | "customHandle";

const PLUS: Capability[] = [
  "reportCarousel",
  "correlationCard",
  "publicationExport",
  "transparentExport",
  "embed",
  "liveBadge",
  "eventSegments",
];

const TRADER: Capability[] = [
  ...PLUS,
  "sessionRecapCard",
  "setupPerformance",
  "motionExport",
  "verifiedTrackRecord",
  "customHandle",
];

const BY_TIER: Record<Tier, Capability[]> = {
  free: [],
  plus: PLUS,
  trader: TRADER,
};

/** The tier a capability first appears at — what a lock chip names. */
export function tierFor(capability: Capability): Exclude<Tier, "free"> {
  return PLUS.includes(capability) ? "plus" : "trader";
}

export interface Viewer {
  tier: Tier;
}

export function can(user: Viewer | null | undefined, capability: Capability): boolean {
  return BY_TIER[user?.tier ?? "free"].includes(capability);
}

export function capabilities(tier: Tier): Capability[] {
  return BY_TIER[tier];
}

/**
 * Every tier can mint and share every card its behaviour has earned,
 * including the scarce ones. This takes no tier on purpose — a caller
 * cannot accidentally gate it.
 */
export function canMintCards(): true {
  return true;
}

export function canShareCards(): true {
  return true;
}

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  plus: "Plus",
  trader: "Trader",
};

export const TIER_PRICE: Record<Tier, { monthly: number; yearly: number | null }> = {
  free: { monthly: 0, yearly: null },
  plus: { monthly: 9, yearly: 86 },
  trader: { monthly: 29, yearly: 278 },
};

/** A subscription only entitles anything while Stripe says it is live. */
const LIVE = new Set(["active", "trialing"]);

export function tierFromStatus(tier: Tier, status: string | null): Tier {
  return status && LIVE.has(status) ? tier : "free";
}

export function isTier(value: unknown): value is Tier {
  return value === "free" || value === "plus" || value === "trader";
}

/**
 * Readiness — the honest half of a lock. "You already have enough data for
 * this" converts; a feature list does not. Computed from real sample counts,
 * so a `Ready now` is never faked.
 */
export interface Readiness {
  ready: boolean;
  /** What the lock says under the tier chip. */
  label: string;
}

export function readiness(have: number, need: number): Readiness {
  if (have >= need) return { ready: true, label: "Ready now" };
  const short = need - have;
  return { ready: false, label: `${short} ${short === 1 ? "tag" : "tags"} to go` };
}
