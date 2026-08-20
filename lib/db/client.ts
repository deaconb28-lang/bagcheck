import { MongoClient } from "mongodb";

declare global {
  // Cached across hot reloads in dev and across route invocations in prod.
  var _supercruiseMongo: Promise<MongoClient> | undefined;
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
  if (!globalThis._supercruiseMongo) {
    globalThis._supercruiseMongo = new MongoClient(uri).connect();
  }
  return globalThis._supercruiseMongo;
}

export function dbName(): string {
  /*
   * The fallback says "supercruise" now, and the thing that makes that safe is
   * stated here rather than assumed: **`MONGODB_DB` is set explicitly on the
   * deployment.** The live data sits in whatever database that variable names,
   * and this line is never consulted there.
   *
   * It was "bagcheck" for exactly one reason — a database name is an address
   * rather than a brand, and moving an address silently is how a deployment
   * ends up reading an empty database and treating every live account as new.
   * That risk has not gone away; it has moved. **If `MONGODB_DB` is ever unset
   * on a deployment that has real data, this line will point it at a fresh,
   * empty database rather than at the ledger.** Keep it set.
   *
   * `scripts/seed.mjs` and the two harness scripts write and read the same
   * name against an in-memory server, so all four move together or none do.
   */
  return process.env.MONGODB_DB ?? "supercruise";
}
