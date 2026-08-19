import { MongoClient } from "mongodb";

declare global {
  // Cached across hot reloads in dev and across route invocations in prod.
  var _canopyMongo: Promise<MongoClient> | undefined;
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
  if (!globalThis._canopyMongo) {
    globalThis._canopyMongo = new MongoClient(uri).connect();
  }
  return globalThis._canopyMongo;
}

export function dbName(): string {
  /*
   * Still "bagcheck", and deliberately.
   *
   * The product was renamed to Supercruise; its storage was not. A database
   * name is an address, not a brand — pointing the fallback at "supercruise"
   * would aim a fresh deployment at an empty database and read every live
   * account as a new one. `MONGODB_DB` is set explicitly in production; this is the local and
   * CI default, and it has to keep matching what the seed script writes.
   */
  return process.env.MONGODB_DB ?? "bagcheck";
}
