import { MongoClient } from "mongodb";

declare global {
  // Cached across hot reloads in dev and across route invocations in prod.
  var _bagcheckMongo: Promise<MongoClient> | undefined;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

/**
 * Lazy client getter — nothing connects (or throws for a missing URI) until
 * the first actual database access, so the app builds and boots without env.
 */
export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (!globalThis._bagcheckMongo) {
    globalThis._bagcheckMongo = new MongoClient(uri).connect();
  }
  return globalThis._bagcheckMongo;
}

export function dbName(): string {
  return process.env.MONGODB_DB ?? "bagcheck";
}
