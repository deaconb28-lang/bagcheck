import type { Binary } from "mongodb";
import type { AccountUniversalActivity, Position } from "snaptrade-typescript-sdk";
import type { Contributor, RoundTrip, ScoreComponents, StyleBaseline } from "@/lib/score";
import type { SyncPhase, SyncStatus } from "@/lib/snaptrade/progress";

export interface ConnectionAccount {
  id: string;
  name: string | null;
  number: string | null;
  institution: string | null;
}

export interface ConnectionDoc {
  userId: string;
  /** The userId registered with SnapTrade (same as our userId). */
  snaptradeUserId: string;
  snaptradeUserSecret: string;
  accounts: ConnectionAccount[];
  createdAt: Date;
  lastSyncAt: Date | null;
  /** Chosen at onboarding (M3+); until then the scorer infers from cadence. */
  styleBaseline?: StyleBaseline;
}

export interface TransactionDoc {
  userId: string;
  /** SnapTrade activity id. */
  externalId: string;
  accountId: string | null;
  /** Trade date, ISO string as reported by the brokerage. */
  date: string | null;
  settledAt: string | null;
  type: string | null;
  symbol: string | null;
  units: number | null;
  price: number | null;
  amount: number | null;
  currency: string | null;
  fee: number | null;
  institution: string | null;
  description: string | null;
  raw: AccountUniversalActivity;
  syncedAt: Date;
}

export interface PositionSnapshotDoc {
  userId: string;
  accountId: string;
  /** YYYY-MM-DD — one snapshot per account per day. */
  date: string;
  takenAt: Date;
  positions: Position[];
  /**
   * Uninvested cash across the account's balances, when the brokerage says.
   * Null on every snapshot taken before this was read, and on any brokerage
   * that will not answer — the curve degrades to positions-only rather than
   * stepping when it appears.
   */
  cash?: number | null;
}

export interface ScoreDoc {
  userId: string;
  date: string;
  baseline: StyleBaseline;
  score: number;
  components: ScoreComponents;
  contributors: Contributor[];
  computedAt: Date;
}

export interface PulseDoc {
  userId: string;
  date: string;
  questionId: string;
  answer: string;
  answeredAt: Date;
}

export interface TagDoc {
  userId: string;
  date: string;
  transactionId: string;
  why: "thesis" | "momentum" | "saw it online" | "felt cheap" | "revenge";
  conviction: 1 | 2 | 3 | 4 | 5;
}

/** One row per waitlist signup. Email is the identity; tier is what they asked for. */
export interface WaitlistDoc {
  email: string;
  /** "waitlist" | "early" | "premium" — which card they joined from. */
  tier: string;
  joinedAt: Date;
}

/**
 * A live score badge. The slug is 96 bits of randomness and is the badge's
 * whole access model, exactly like a card — minted once per user, and the
 * public SVG at /api/badge/[slug] re-reads the score on every cache miss.
 */
export interface BadgeDoc {
  userId: string;
  slug: string;
  mintedAt: Date;
}

export interface InsightDoc {
  userId: string;
  date: string;
  kind: string;
  /** The headline sentence. */
  text: string;
  tail?: string;
  /** Whether the model's draft shipped, or the deterministic readout did. */
  source?: "model" | "fallback";
  rejected?: string | null;
  generatedAt?: Date;
}

/**
 * A minted share card. The slug is the only thing standing between the card
 * and the public internet, so it is random rather than derived — a card is
 * meant to be pasted, and anything guessable would leak the rest of them.
 */
export interface CardDoc {
  userId: string;
  date: string;
  type: string;
  slug: string;
  label: string;
  value: string;
  tail: string;
  tone: "moss" | "signal";
  rarity: "rare" | null;
  /**
   * The instrument the card is about, when it is about one — the company
   * whose mark and ticker the card wears.
   */
  symbol: string | null;
  mintedAt: Date;
  url: string | null;
}

/**
 * Billing state, mirrored from Stripe. Stripe is the source of truth; this
 * is a cache so the app shell can read a tier without a network call on
 * every page.
 */
export interface SubscriptionDoc {
  userId: string;
  /** The tier the price maps to, before status is considered. */
  /*
   * The stored plan name. The legacy values survive here on purpose: live
   * Stripe subscriptions are attached to those price objects, and rewriting
   * history to match a rename would be a migration with no upside. Reads go
   * through `normaliseTier`.
   */
  tier: "free" | "plus" | "trader" | "pro";
  /** Stripe's subscription status verbatim. */
  status: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: Date;
}

/**
 * Shared market-data cache. Keyed by request, not by user: the rate limit is
 * per API key, so two people holding the same name should cost one call.
 * Swept by a TTL index on expiresAt.
 */
export interface MarketCacheDoc {
  key: string;
  value: unknown;
  fetchedAt: Date;
  expiresAt: Date;
}

/**
 * The photograph behind a card kind's art band.
 *
 * Metadata only, never the bytes: Unsplash's terms require that images are
 * hotlinked from their own CDN rather than re-hosted, so what is stored here
 * is the URL to link to plus the credit that has to appear beside it. No
 * TTL, for the same reason the icons have none — the picture for a kind is
 * chosen once and then it is the picture for that kind.
 */
export interface PhotoDoc {
  /** The card kind this photograph belongs to. Unique. */
  kind: string;
  /** Unsplash's own id, so a photo can be traced back. */
  photoId: string;
  /** The CDN url, already sized. Hotlinked, never copied. */
  url: string;
  /** Average colour, for the plate that shows while the photo loads. */
  color: string;
  /** Photographer's name, rendered wherever the photo appears. */
  creditName: string;
  /** Their profile, carrying the referral parameters Unsplash requires. */
  creditProfileUrl: string;
  /** The photo's page on Unsplash. */
  creditPhotoUrl: string;
  fetchedAt: Date;
}

/**
 * Icons already fetched from The Noun Project. No TTL: an icon does not
 * change, the vocabulary is fixed and small, and every call costs quota —
 * so this is the store, not a cache in front of one.
 */
export interface IconDoc {
  name: string;
  svg: string;
  /** The CC-BY credit line, rendered on /legal/icons. */
  credit: string;
  nounId: string | null;
}

/**
 * A company's mark, fetched once and kept.
 *
 * The bytes are stored, unlike the photographs — Unsplash's terms require
 * hotlinking, logo providers' do not, and a ticker's mark has to be on the
 * first paint of a holdings table rather than three round trips into it.
 * Keyed by `{symbol, size}` because the sources render per size, so a 256px
 * card mark and a 32px row mark are two different images.
 *
 * A miss is stored too, with `bytes: null`. Without that, one holding nobody
 * has a logo for would call three third parties on every page view. Misses
 * expire (`MISS_TTL_MS`); hits never do.
 */
export interface LogoDoc {
  /** Normalised ticker — uppercase, `normalizeSymbol` already applied. */
  symbol: string;
  size: number;
  bytes: Binary | null;
  /** The response's own content type, echoed back by the proxy. */
  type: string | null;
  /** Which link in the chain answered. Null on a miss. */
  source: string | null;
  fetchedAt: Date;
}

/**
 * A reader's finished Wrapped cards for one year.
 *
 * Twelve model calls is cheap but not free, and opening your year twice in a
 * day should pay for it once. Keyed on a fingerprint of the stats themselves
 * rather than a sync time: a sync that moved no figure a card states should
 * not invalidate the set, and the ledger moves far more often than a year's
 * headline numbers do.
 */
export interface WrappedCardsDoc {
  userId: string;
  year: number;
  fingerprint: string;
  cards: Array<{
    no: string;
    key: string;
    html: string;
    caption: string;
    source: "model" | "fallback";
    discarded: string | null;
  }>;
  builtAt: Date;
}

/**
 * One row per message actually sent.
 *
 * The unique index is on {userId, date}, not {userId, date, kind} — that is
 * the point. "One notification a day" stops being a rule someone has to
 * remember and becomes a thing the database will not let happen twice, no
 * matter which cron fires or how many times it retries.
 */
export interface EmailLogDoc {
  userId: string;
  /** YYYY-MM-DD in UTC. */
  date: string;
  kind: "brief" | "recap";
  providerId: string | null;
  sentAt: Date;
}

/**
 * Per-user display preferences. Mode lives here rather than in localStorage
 * so the choice follows the reader to another device instead of being a
 * property of one browser.
 */
export interface PrefsDoc {
  userId: string;
  /** New users default to dark; this only exists once they have chosen. */
  mode: "light" | "dark";
  /**
   * Email is opt-in and off by default. Sending someone mail they did not ask
   * for is an outward-facing act, and the product's promise is one
   * notification a day — not one they have to go and switch off.
   */
  emailDaily?: boolean;
  emailWeekly?: boolean;
  updatedAt: Date;
}

/**
 * Live progress for one sync run, so the onboarding dialog can show real
 * counts instead of a spinner and an estimate. One document per user,
 * overwritten by each run — this is a status board, not a log.
 *
 * The sync writes it as it goes and the dialog polls it; the two never share
 * a process, which is the whole reason it is in Mongo rather than in memory.
 */
export interface SyncProgressDoc {
  userId: string;
  /** The phase the run reached. Retained on failure so the dialog can say where. */
  phase: SyncPhase;
  status: SyncStatus;
  error: string | null;
  accountsTotal: number;
  accountsDone: number;
  positions: number;
  transactions: number;
  earliestDate: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  elapsedMs: number | null;
}

/**
 * Where a nightly sweep got to. One row per job, not per user.
 *
 * It was reached through `getDb().collection("cronState")` rather than
 * declared here, which put it outside every check this layer has: no index, no
 * type, and invisible to the test that asserts each stored collection is
 * either erased on request or exempt with a stated reason. A collection nobody
 * is checking is the failure that test exists to prevent, so it is declared.
 */
export interface CronStateDoc {
  /** The job's name — `nightly-score`, `notify`. Unique. */
  job: string;
  /** The last userId completed, or null at the start of a sweep. */
  cursor: string | null;
  /** How many times the sweep has been all the way round. */
  sweeps: number;
  updatedAt: Date;
}

/**
 * The derived layer — round trips, daily P&L, forward-filled equity and hold
 * times, computed once per sync rather than on every page view.
 *
 * `version` retires every document at once after a logic change; `ledgerHash`
 * and `transactionCount` let a read skip the rebuild when nothing moved.
 */
export interface DerivedDoc {
  userId: string;
  version: number;
  ledgerHash: string;
  computedAt: Date;
  transactionCount: number;
  roundTrips: RoundTrip[];
  dailyPnl: Array<{ date: string; realised: number }>;
  /** `withCash` says whether the mark is the whole account or the book. */
  equitySeries: Array<{ date: string; value: number; interpolated: boolean; withCash: boolean }>;
  holdTime: {
    winnersMean: number | null;
    losersMean: number | null;
    winners: number;
    losers: number;
  };
  /** Names whose FIFO-implied units disagree with the snapshot. Never in statistics. */
  excludedSymbols: string[];
  /**
   * Ledger-only engine findings plus event windows, with dollar impacts —
   * computed once per sync so Home can answer "where did the money go"
   * without scanning. Tag-joined findings are not here: tags move without a
   * sync, so Patterns computes those live.
   */
  findings: Array<{
    key: string;
    tag: string;
    sentence: string;
    evidence: string;
    tone: "moss" | "signal" | "clay";
    impact: number | null;
  }>;
}
