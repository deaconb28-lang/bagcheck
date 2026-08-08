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
  /** The instrument the card is about, when it is about one. */
  symbol: string | null;
  /**
   * Generated backdrop for Wrapped cards, stored as PNG bytes so the card
   * looks identical on every open. Null on every other kind.
   */
  art: Binary | null;
  artModel: string | null;
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
  tier: "free" | "plus" | "trader";
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
  equitySeries: Array<{ date: string; value: number; interpolated: boolean }>;
  holdTime: {
    winnersMean: number | null;
    losersMean: number | null;
    winners: number;
    losers: number;
  };
  /** Names whose FIFO-implied units disagree with the snapshot. Never in statistics. */
  excludedSymbols: string[];
}
