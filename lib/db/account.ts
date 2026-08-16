import { getCollections, getDb } from "./collections";

/**
 * Export and erasure — the two things a person is entitled to ask for about
 * their own data, and the two a product like this has no excuse not to ship.
 *
 * Both are defined off one list of collections rather than a hand-written
 * sequence of calls, so a collection added later cannot be quietly left out
 * of the delete while still appearing in the export. That asymmetry is the
 * failure mode: a deletion that misses a collection is a promise broken
 * silently.
 */

/** Every collection keyed by `userId`. Order is the order they are read in. */
export const PERSONAL_COLLECTIONS = [
  "connections",
  "transactions",
  "positionSnapshots",
  "scores",
  "derived",
  "tags",
  "pulses",
  "insights",
  "cards",
  "badges",
  "prefs",
  "emailLog",
  "syncProgress",
  "subscriptions",
  "wrappedCards",
] as const;

export type PersonalCollection = (typeof PERSONAL_COLLECTIONS)[number];

export interface AccountExport {
  exportedAt: string;
  userId: string;
  /** One key per collection, each an array of that collection's documents. */
  data: Record<string, unknown[]>;
  counts: Record<string, number>;
}

/**
 * Everything stored about one person, as JSON.
 *
 * `_id` is dropped from every document: it is our storage key, it means
 * nothing outside this database, and a Mongo ObjectId serialises to a shape
 * that reads like an identifier the reader should care about.
 */
export async function exportAccount(userId: string): Promise<AccountExport> {
  const db = await getDb();
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const name of PERSONAL_COLLECTIONS) {
    const docs = await db
      .collection(name)
      .find({ userId })
      .project({ _id: 0 })
      .toArray();
    data[name] = docs;
    counts[name] = docs.length;
  }

  return {
    exportedAt: new Date().toISOString(),
    userId,
    data,
    counts,
  };
}

export interface DeletionResult {
  deleted: Record<string, number>;
  total: number;
}

/**
 * Erase the account.
 *
 * The ledger, the scores, the connection, the tags, the minted cards and the
 * badge all go, along with the Auth.js session and account records — so the
 * next sign-in with the same Google account starts from nothing rather than
 * resurrecting a half-deleted profile.
 *
 * What this does *not* do is cancel a Stripe subscription: Stripe is the
 * source of truth for billing and deleting our mirror of it would leave a
 * live subscription nobody can see. The caller cancels first.
 */
export async function deleteAccount(userId: string): Promise<DeletionResult> {
  const db = await getDb();
  const deleted: Record<string, number> = {};

  for (const name of PERSONAL_COLLECTIONS) {
    const res = await db.collection(name).deleteMany({ userId });
    deleted[name] = res.deletedCount ?? 0;
  }

  /*
   * The Auth.js adapter's own collections. They are keyed by the user's
   * ObjectId rather than by `userId`, and they are the reason a "deleted"
   * account used to come back the moment the same Google account signed in.
   */
  const { ObjectId } = await import("mongodb");
  let oid: InstanceType<typeof ObjectId> | null = null;
  try {
    oid = new ObjectId(userId);
  } catch {
    oid = null;
  }
  if (oid) {
    const sessions = await db.collection("sessions").deleteMany({ userId: oid });
    const accounts = await db.collection("accounts").deleteMany({ userId: oid });
    const users = await db.collection("users").deleteMany({ _id: oid });
    deleted.sessions = sessions.deletedCount ?? 0;
    deleted.accounts = accounts.deletedCount ?? 0;
    deleted.users = users.deletedCount ?? 0;
  }

  const total = Object.values(deleted).reduce((sum, n) => sum + n, 0);
  return { deleted, total };
}

export interface Footprint {
  transactions: number;
  scores: number;
  cards: number;
  tags: number;
}

/** Kept for the confirmation copy: what the reader is about to lose. */
export async function accountFootprint(userId: string): Promise<Footprint> {
  const c = await getCollections();
  const [transactions, scores, cards, tags] = await Promise.all([
    c.transactions.countDocuments({ userId }),
    c.scores.countDocuments({ userId }),
    c.cards.countDocuments({ userId }),
    c.tags.countDocuments({ userId }),
  ]);
  return { transactions, scores, cards, tags };
}
