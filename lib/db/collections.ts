import type { Db } from "mongodb";
import { dbName, getMongoClient } from "./client";
import type {
  CardDoc,
  ConnectionDoc,
  IconDoc,
  InsightDoc,
  MarketCacheDoc,
  PositionSnapshotDoc,
  PrefsDoc,
  PulseDoc,
  ScoreDoc,
  SubscriptionDoc,
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
    pulses: db.collection<PulseDoc>("pulses"),
    tags: db.collection<TagDoc>("tags"),
    insights: db.collection<InsightDoc>("insights"),
    cards: db.collection<CardDoc>("cards"),
    subscriptions: db.collection<SubscriptionDoc>("subscriptions"),
    marketCache: db.collection<MarketCacheDoc>("marketCache"),
    icons: db.collection<IconDoc>("icons"),
    prefs: db.collection<PrefsDoc>("prefs"),
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
    c.prefs.createIndex({ userId: 1 }, { unique: true }),
  ]);
}
