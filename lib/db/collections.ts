import type { Db } from "mongodb";
import { dbName, getMongoClient } from "./client";
import type {
  BadgeDoc,
  WaitlistDoc,
  CardDoc,
  EmailLogDoc,
  ConnectionDoc,
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
    syncProgress: db.collection<SyncProgressDoc>("syncProgress"),
  };
}

/** Idempotent — compound {userId, date} indexes everywhere, per the data model. */
export async function ensureIndexes() {
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
    // Deliberately not keyed on kind: this index is what enforces one
    // notification a day, whichever cron gets there first.
    c.emailLog.createIndex({ userId: 1, date: 1 }, { unique: true }),
    c.derived.createIndex({ userId: 1 }, { unique: true }),
    c.syncProgress.createIndex({ userId: 1 }, { unique: true }),
  ]);
}
