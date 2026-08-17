import type { Db } from "mongodb";
import { dbName, getMongoClient } from "./client";
import type {
  BadgeDoc,
  WaitlistDoc,
  CardDoc,
  EmailLogDoc,
  ConnectionDoc,
  CronStateDoc,
  DerivedDoc,
  IconDoc,
  InsightDoc,
  LogoDoc,
  MarketCacheDoc,
  PhotoDoc,
  PositionSnapshotDoc,
  PrefsDoc,
  PulseDoc,
  ScoreDoc,
  SubscriptionDoc,
  SyncProgressDoc,
  TagDoc,
  WrappedCardsDoc,
  TransactionDoc,
} from "./types";

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName());
}

export async function getCollections() {
  const db = await getDb();
  return {
    connections: db.collection<ConnectionDoc>("connections"),
    transactions: db.collection<TransactionDoc>("transactions"),
    positionSnapshots: db.collection<PositionSnapshotDoc>("positionSnapshots"),
    scores: db.collection<ScoreDoc>("scores"),
    /*
     * Retired. The daily pulse asked how the market felt and nothing ever
     * read the answers — a second input loop competing with the tag loop,
     * which is the only input a brokerage cannot supply. The collection
     * stays declared so `deleteAccount` still erases anything written while
     * it was live; nothing writes to it now.
     */
    pulses: db.collection<PulseDoc>("pulses"),
    tags: db.collection<TagDoc>("tags"),
    insights: db.collection<InsightDoc>("insights"),
    cards: db.collection<CardDoc>("cards"),
    badges: db.collection<BadgeDoc>("badges"),
    waitlist: db.collection<WaitlistDoc>("waitlist"),
    subscriptions: db.collection<SubscriptionDoc>("subscriptions"),
    marketCache: db.collection<MarketCacheDoc>("marketCache"),
    icons: db.collection<IconDoc>("icons"),
    logos: db.collection<LogoDoc>("logos"),
    photos: db.collection<PhotoDoc>("photos"),
    prefs: db.collection<PrefsDoc>("prefs"),
    emailLog: db.collection<EmailLogDoc>("emailLog"),
    derived: db.collection<DerivedDoc>("derived"),
    wrappedCards: db.collection<WrappedCardsDoc>("wrappedCards"),
    syncProgress: db.collection<SyncProgressDoc>("syncProgress"),
    cronState: db.collection<CronStateDoc>("cronState"),
  };
}

/**
 * Applied once per process.
 *
 * `ensureIndexes` is two dozen round trips to Atlas and it was being awaited
 * at the top of every sync, every scoring run and every insight write — on a
 * warm server that is the same two dozen calls answering "yes, still there"
 * many times a minute. `createIndex` is idempotent, so the only thing repeating
 * it buys is latency.
 *
 * Deliberately a cached *promise* rather than a boolean: two requests arriving
 * together must await the same round trip rather than start two. A failure
 * clears the cache so the next caller retries — a transient Atlas blip must
 * not leave a process permanently believing it has indexes it does not.
 *
 * A process restart re-runs it, which is the right frequency: it is how a new
 * deployment picks up an index added in that deployment. `npm run db:indexes`
 * is the way to apply them without waiting for one.
 */
let applied: Promise<void> | null = null;

export function ensureIndexes(): Promise<void> {
  applied ??= createIndexes().catch((err) => {
    applied = null;
    throw err;
  });
  return applied;
}

/** Idempotent — compound {userId, date} indexes everywhere, per the data model. */
export async function createIndexes() {
  const c = await getCollections();
  await Promise.all([
    c.connections.createIndex({ userId: 1 }, { unique: true }),
    c.transactions.createIndex({ userId: 1, externalId: 1 }, { unique: true }),
    c.transactions.createIndex({ userId: 1, date: 1 }),
    c.positionSnapshots.createIndex({ userId: 1, accountId: 1, date: 1 }, { unique: true }),
    c.positionSnapshots.createIndex({ userId: 1, date: 1 }),
    c.scores.createIndex({ userId: 1, date: 1 }, { unique: true }),
    c.pulses.createIndex({ userId: 1, date: 1 }, { unique: true }),
    c.tags.createIndex({ userId: 1, date: 1 }),
    // One tag per entry — the prompt upserts, so this is what makes it idempotent.
    c.tags.createIndex({ userId: 1, transactionId: 1 }, { unique: true }),
    c.insights.createIndex({ userId: 1, date: 1, kind: 1 }, { unique: true }),
    c.cards.createIndex({ userId: 1, date: 1 }),
    c.cards.createIndex({ slug: 1 }, { unique: true }),
    /*
     * One badge per user, which is what `mintBadge` says and what nothing was
     * enforcing: it reads, finds none, and inserts — so two requests arriving
     * together minted two badges for one person, and `badgeBySlug` then
     * answered from whichever the scan reached first. The unique index is what
     * makes the read-then-insert safe rather than merely usually right.
     */
    c.badges.createIndex({ userId: 1 }, { unique: true }),
    /* The slug is the badge's entire access model, exactly like a card's. */
    c.badges.createIndex({ slug: 1 }, { unique: true }),
    /*
     * The waitlist upserts by lowercased address and the route reports whether
     * the person was already on it. Without this, two submissions racing each
     * other both insert, the count is wrong, and both are told they are new.
     */
    c.waitlist.createIndex({ email: 1 }, { unique: true }),
    /*
     * One row per job. An upsert with no unique key can insert a second row
     * under concurrency, and a duplicated cursor means the sweep reads one and
     * writes the other — users re-synced (SnapTrade is billed per call) or
     * skipped entirely, which is the failure the resumable sweep was built to
     * end.
     */
    c.cronState.createIndex({ job: 1 }, { unique: true }),
    c.subscriptions.createIndex({ userId: 1 }, { unique: true }),
    c.subscriptions.createIndex({ stripeCustomerId: 1 }),
    c.marketCache.createIndex({ key: 1 }, { unique: true }),
    // Mongo sweeps expired entries; nothing has to remember to.
    c.marketCache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.icons.createIndex({ name: 1 }, { unique: true }),
    // A mark is fetched per size, so the pair is the key — and the uniqueness
    // is what makes the write-through idempotent under concurrent renders.
    c.logos.createIndex({ symbol: 1, size: 1 }, { unique: true }),
    c.photos.createIndex({ kind: 1 }, { unique: true }),
    c.prefs.createIndex({ userId: 1 }, { unique: true }),
    /*
     * One handle each, and only among readers who claimed one — `sparse`, so
     * the many rows with no handle do not all collide on null. Unique because
     * `/@deacon` has to name exactly one person.
     */
    c.prefs.createIndex({ handle: 1 }, { unique: true, sparse: true }),
    // Deliberately not keyed on kind: this index is what enforces one
    // notification a day, whichever cron gets there first.
    c.emailLog.createIndex({ userId: 1, date: 1 }, { unique: true }),
    c.derived.createIndex({ userId: 1 }, { unique: true }),
    /*
     * One deck per reader per year *per window*. It was one per year, and that
     * index actively prevents the quarters from existing: the second window
     * written for a year would collide with the first. Dropping the old one is
     * part of creating the new one — a unique index nobody can satisfy is not
     * a leftover, it is an outage.
     */
    c.wrappedCards.dropIndex("userId_1_year_1").catch(() => {
      /* Already gone, or this database never had it. Both are fine. */
    }),
    c.wrappedCards.createIndex({ userId: 1, year: 1, window: 1 }, { unique: true }),
    c.syncProgress.createIndex({ userId: 1 }, { unique: true }),
  ]);
}
