/**
 * What a plan buys — pure, no Stripe, no I/O.
 *
 * Gating lives here and nowhere else. Components ask `can()`; no component
 * reads `user.tier` directly, so there is exactly one place to audit and
 * exactly one place a mistake can be made.
 *
 * **One paid plan, and it only sells what is actually enforced.** There were
 * two tiers and twelve capabilities, of which six had no implementation at
 * all — `embed`, `eventSegments`, `setupPerformance`, `motionExport`,
 * `verifiedTrackRecord`, `customHandle` — and two more gated screens that no
 * longer exist. Selling a feature list longer than the feature set is the one
 * thing a paywall must never do, so the list here is now exactly the set of
 * capabilities a server route checks before doing work.
 *
 * The product's promise is that sharing is never paywalled and rarity is never
 * sold, and that is enforced structurally rather than by discipline:
 * `Capability` contains no member for minting a card, for rarity, or for
 * sharing one, so a gate against them cannot be written. The paid plan unlocks
 * *formats*, and nothing else.
 */

export type Tier = "free" | "pro";

export type Capability =
  /** A ZIP of the year's cards, sized for a carousel post. */
  | "reportCarousel"
  /** The correlation card — the one kind drawn from tagged entries. */
  | "correlationCard"
  /** 4× PNG exports at publication size. */
  | "publicationExport"
  /** The same export with a transparent ground. */
  | "transparentExport"
  /** A live SVG badge at a URL, for a profile or a README. */
  | "liveBadge";

const PRO: Capability[] = [
  "reportCarousel",
  "correlationCard",
  "publicationExport",
  "transparentExport",
  "liveBadge",
];

const BY_TIER: Record<Tier, Capability[]> = {
  free: [],
  pro: PRO,
};

/**
 * Legacy plan names, mapped forward.
 *
 * Stored subscriptions and live Stripe prices still say `plus` and `trader`,
 * and a subscriber must not silently drop to free because the product renamed
 * its plans. Every read of a stored tier goes through here.
 */
export function normaliseTier(value: unknown): Tier {
  if (value === "pro" || value === "plus" || value === "trader") return "pro";
  return "free";
}

export function isTier(value: unknown): value is Tier {
  return value === "free" || value === "pro";
}

/** The plan a capability belongs to — what a lock chip names. */
export function tierFor(_capability: Capability): Exclude<Tier, "free"> {
  return "pro";
}

export interface Viewer {
  tier: Tier;
}

export function can(user: Viewer | null | undefined, capability: Capability): boolean {
  return BY_TIER[normaliseTier(user?.tier)].includes(capability);
}

export function capabilities(tier: Tier): Capability[] {
  return BY_TIER[normaliseTier(tier)];
}

/**
 * Every plan can mint and share every card its behaviour has earned,
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
  pro: "Pro",
};

export const TIER_PRICE: Record<Tier, { monthly: number; yearly: number | null }> = {
  free: { monthly: 0, yearly: null },
  pro: { monthly: 9, yearly: 86 },
};

/** What the plan actually contains, for the pricing table and the plan card. */
export const CAPABILITY_LABEL: Record<Capability, string> = {
  reportCarousel: "Your year as a carousel — every card, sized for a post",
  correlationCard: "Correlation cards, drawn from your tagged entries",
  publicationExport: "4× PNG exports at publication size",
  transparentExport: "The same export on a transparent ground",
  liveBadge: "A live badge at its own URL, for a profile or a README",
};

export const FREE_ALWAYS: string[] = [
  "Every card your behaviour earns, including the scarce ones",
  "Sharing, at full quality, forever",
  "The Health score, its four components and the daily read",
  "Your whole ledger, read-only",
];

/** A subscription only entitles anything while Stripe says it is live. */
const LIVE = new Set(["active", "trialing"]);

export function tierFromStatus(tier: Tier, status: string | null): Tier {
  return status && LIVE.has(status) ? normaliseTier(tier) : "free";
}

/**
 * The reverse trial.
 *
 * A week of everything, starting when a brokerage connects — not when an
 * account is created, because an account with no ledger has nothing to unlock
 * and would burn the window on an empty screen.
 *
 * It was fourteen days, which meant every launch user had full access and no
 * reason to look at the plan for the entire window in which we would be
 * measuring whether anyone wants it. Seven still shows the whole product.
 *
 * There is no countdown and no nag. A trial states the date it ends, once,
 * where the plan is described. "Three days left" is urgency, and urgency is
 * the thing this product does not do.
 */
export const TRIAL_DAYS = 7;

/** Full access during the trial — the point is to show the whole product. */
export const TRIAL_TIER: Tier = "pro";

export interface TrialState {
  active: boolean;
  /** YYYY-MM-DD the trial ends, or null when there is no trial to describe. */
  endsOn: string | null;
  /** True once it has run out — what turns the locks back on. */
  expired: boolean;
}

export function trialState(
  connectedAt: Date | null | undefined,
  now: Date,
  days = TRIAL_DAYS,
): TrialState {
  if (!connectedAt) return { active: false, endsOn: null, expired: false };
  const end = new Date(connectedAt.getTime() + days * 86_400_000);
  const endsOn = end.toISOString().slice(0, 10);
  return now < end
    ? { active: true, endsOn, expired: false }
    : { active: false, endsOn, expired: true };
}

/**
 * What the app should act on: the paid plan when there is one, the trial plan
 * while the trial is running, free otherwise.
 *
 * Paid always wins. Someone who subscribes on day two is on their own plan,
 * not on a trial that would silently expire under them.
 */
export function effectiveTier(paid: Tier, trial: TrialState): Tier {
  if (normaliseTier(paid) !== "free") return "pro";
  return trial.active ? TRIAL_TIER : "free";
}

/** The one line the trial is allowed to say. A date, not a countdown. */
export function trialLine(trial: TrialState): string | null {
  if (trial.active && trial.endsOn) {
    return `Full access through ${trial.endsOn}. After that, Canopy stays free and the paid formats lock.`;
  }
  if (trial.expired && trial.endsOn) {
    return `Your full-access window ended ${trial.endsOn}. Everything you have minted stays yours.`;
  }
  return null;
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
