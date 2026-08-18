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

/**
 * One price, monthly, and no annual plan.
 *
 * There was a $86 year alongside the $9 month. An annual price is a second
 * thing to state on every surface that mentions the first, and nothing in the
 * product asked for one — so it is `null` here rather than quietly carried,
 * and the surfaces that used to print it now print nothing.
 */
export const TIER_PRICE: Record<Tier, { monthly: number; yearly: number | null }> = {
  free: { monthly: 0, yearly: null },
  pro: { monthly: 14.99, yearly: null },
};

/** The price as it is written down. `14.99` must never print as `$14.99/mo`
 *  in one place and `$15/mo` in another. */
export function priceLine(): string {
  return `$${TIER_PRICE.pro.monthly.toFixed(2)}/month`;
}

/** What the plan actually contains, for the pricing table and the plan card. */
export const CAPABILITY_LABEL: Record<Capability, string> = {
  reportCarousel: "Your year as a carousel — every card, sized for a post",
  correlationCard: "Correlation cards, drawn from your tagged entries",
  publicationExport: "4× PNG exports at publication size",
  transparentExport: "The same export on a transparent ground",
  liveBadge: "A live badge at its own URL, for a profile or a README",
};

/**
 * What the subscription contains — which is everything.
 *
 * This was `FREE_ALWAYS`, the list of things that survived a lapsed trial.
 * Under a subscription nothing survives it, so a list headed "always free"
 * would be the exact failure this file's own header warns about: a paywall
 * must never advertise something it does not deliver. Same items, honest
 * heading — they are what the thirty days shows you and what the plan keeps.
 */
export const PLAN_INCLUDES: string[] = [
  "Every card your behaviour earns, including the scarce ones",
  "Sharing, at full quality — a minted card stays yours",
  "The Health score, its four components and the daily read",
  "Your whole ledger, read-only, and every pattern it can prove",
];

/** A subscription only entitles anything while Stripe says it is live. */
const LIVE = new Set(["active", "trialing"]);

export function tierFromStatus(tier: Tier, status: string | null): Tier {
  return status && LIVE.has(status) ? normaliseTier(tier) : "free";
}

/**
 * The trial, and it is now the only way in.
 *
 * Thirty days of the whole product, no card, starting when a brokerage
 * connects — **not** when an account is created, and that anchor is what
 * keeps a hard paywall humane: a person who signed up and never linked an
 * account has never seen the product, and locking them out of something they
 * were never shown would be indefensible. `trialState` returns
 * `expired: false` with no connection on file for exactly that reason.
 *
 * It was seven days on a freemium model, where running out cost you the
 * export formats and nothing else. It buys the whole product now, so it is
 * long enough to contain a full monthly cycle of the thing being sold: a
 * month of conduct is the shortest window in which this product can say
 * anything about how someone trades.
 *
 * There is still no countdown and no nag. A trial states the date it ends,
 * once, where the plan is described. "Three days left" is urgency, and
 * urgency is the thing this product does not do.
 */
export const TRIAL_DAYS = 30;

/** Full access during the trial — the point is to show the whole product. */
export const TRIAL_TIER: Tier = "pro";

export interface TrialState {
  active: boolean;
  /** YYYY-MM-DD the trial ends, or null when there is no trial to describe. */
  endsOn: string | null;
  /** True once it has run out — what turns the locks back on. */
  expired: boolean;
}

/**
 * The day Steadyhands became a subscription.
 *
 * Everyone who connected *before* this has their thirty days measured from
 * here rather than from their connection — otherwise deploying the paywall
 * locks out the entire existing user base in the same instant it ships, with
 * no notice and no window in which to decide. Someone who linked an account
 * eight months ago would open the app to a pay screen having been given
 * nothing at all.
 *
 * This is a one-line cutover rather than a migration because the trial has
 * never been stored: it is derived from the connection date on every read, so
 * moving the anchor moves every existing account's window at once and there is
 * no table to backfill and nothing to get half-done.
 *
 * It can be deleted once it is far enough in the past to be irrelevant — every
 * account connected after it takes its own date, so the branch below stops
 * doing anything the moment the oldest live trial is newer than this.
 */
export const SUBSCRIPTION_FROM = new Date("2026-08-18T00:00:00Z");

export function trialState(
  connectedAt: Date | null | undefined,
  now: Date,
  days = TRIAL_DAYS,
): TrialState {
  if (!connectedAt) return { active: false, endsOn: null, expired: false };
  /* Whichever is later: your connection, or the day the plan came in. */
  const from =
    connectedAt.getTime() > SUBSCRIPTION_FROM.getTime() ? connectedAt : SUBSCRIPTION_FROM;
  const end = new Date(from.getTime() + days * 86_400_000);
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
    return `Free through ${trial.endsOn}, no card. After that Steadyhands is ${priceLine()}.`;
  }
  if (trial.expired && trial.endsOn) {
    return `Your free month ended ${trial.endsOn}. Everything you have minted stays yours.`;
  }
  return null;
}

/**
 * Whether this account may read the product at all.
 *
 * The model changed shape here: gating used to be per *capability*, and the
 * worst a lapsed account suffered was losing the export formats. Steadyhands is
 * a subscription now, so there is a second question above every capability —
 * whether there is any entitlement at all — and this is it.
 *
 * Three ways to be true, and the third is the important one: **an account
 * with no trial on file has not started one**, so it is not locked. That is
 * what stops a person who signed up and never connected a brokerage from
 * meeting a pay screen for a product they have never seen.
 */
export function hasAccess(paid: Tier, trial: TrialState): boolean {
  if (normaliseTier(paid) !== "free") return true;
  if (trial.active) return true;
  return !trial.expired;
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
