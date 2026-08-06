import type { Db } from "mongodb";
import { dbName, getMongoClient } from "./client";
import type {
  CardDoc,
  ConnectionDoc,
  InsightDoc,
  PositionSnapshotDoc,
  ScoreDoc,
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
    tags: db.collection<TagDoc>("tags"),
    insights: db.collection<InsightDoc>("insights"),
    cards: db.collection<CardDoc>("cards"),
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
    c.tags.createIndex({ userId: 1, date: 1 }),
    c.insights.createIndex({ userId: 1, date: 1 }),
    c.cards.createIndex({ userId: 1, date: 1 }),
  ]);
}
