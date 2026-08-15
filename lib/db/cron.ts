import { getCollections, getDb } from "./collections";

/**
 * Cursor state for the nightly jobs.
 *
 * The nightly recompute used to loop every connected user in one request,
 * running a full paginated SnapTrade sync each, serially, under a 60-second
 * cap — about two users before the platform killed it, and the ones after the
 * cut never got scored and never reported that they had not been. A job that
 * silently covers the first two rows of a table is worse than no job.
 *
 * So the sweep is resumable. Each call takes the next slice of users after
 * the stored cursor, works until its time budget is spent, and writes back
 * where it stopped. The schedule then decides how fast the sweep goes round,
 * and one slow user delays the next call rather than losing everyone behind
 * them.
 */

export interface CronState {
  job: string;
  /** The last userId completed, or null at the start of a sweep. */
  cursor: string | null;
  /** How many times the sweep has been all the way round. */
  sweeps: number;
  updatedAt: Date;
}

interface CronStateDoc extends CronState {
  _id?: unknown;
}

async function states() {
  const db = await getDb();
  return db.collection<CronStateDoc>("cronState");
}

export async function cronState(job: string): Promise<CronState> {
  const doc = await (await states()).findOne({ job });
  return {
    job,
    cursor: doc?.cursor ?? null,
    sweeps: doc?.sweeps ?? 0,
    updatedAt: doc?.updatedAt ?? new Date(0),
  };
}

/**
 * The next slice of connected users, ordered by id so the cursor is total.
 *
 * Ordering by `userId` rather than by any timestamp is deliberate: a sweep
 * must terminate, and a key that a running sync can change would let a user
 * jump back in front of the cursor and be visited twice while someone behind
 * it is never visited at all.
 */
export async function nextBatch(job: string, limit: number): Promise<string[]> {
  const { connections } = await getCollections();
  const { cursor } = await cronState(job);
  const query = cursor ? { userId: { $gt: cursor } } : {};
  const rows = await connections
    .find(query)
    .sort({ userId: 1 })
    .limit(limit)
    .project<{ userId: string }>({ _id: 0, userId: 1 })
    .toArray();
  return rows.map((r) => r.userId);
}

/**
 * Record where the sweep got to.
 *
 * `wrapped` means the batch reached the end of the table: the cursor resets
 * so the next call starts the next sweep from the top.
 */
export async function saveCursor(
  job: string,
  lastUserId: string | null,
  wrapped: boolean,
): Promise<void> {
  const collection = await states();
  await collection.updateOne(
    { job },
    {
      $set: { cursor: wrapped ? null : lastUserId, updatedAt: new Date() },
      $inc: { sweeps: wrapped ? 1 : 0 },
      $setOnInsert: { job },
    },
    { upsert: true },
  );
}

/** How many connected accounts a full sweep has to cover. */
export async function connectedCount(): Promise<number> {
  const { connections } = await getCollections();
  return connections.countDocuments({});
}

/**
 * Does this call close the sweep? Pure, because getting it wrong is silent in
 * both directions.
 *
 * Wrapping early resets the cursor over users who were never visited, and
 * they wait a whole cycle. Never wrapping leaves the cursor pinned past the
 * last user, and every subsequent call finds an empty batch and does nothing
 * at all — a job that reports success while having stopped.
 *
 * Both conditions are needed. A full batch means there is more table behind
 * it; a batch cut short by the time budget means there is more of *this*
 * batch left.
 */
export function closesSweep(
  batchSize: number,
  batchLength: number,
  visited: number,
): boolean {
  return batchLength < batchSize && visited === batchLength;
}

export interface SweepOptions {
  /** How many users one call will look at, whatever the clock says. */
  batch?: number;
  /**
   * Stop *starting* new users this far into the run, so the one in flight has
   * room to finish and the cursor is written before the platform cuts us off.
   */
  budgetMs?: number;
  now?: () => number;
}

export interface SweepResult {
  job: string;
  /** Users actually visited this call. */
  visited: number;
  /** True when this call reached the end of the table and reset the cursor. */
  wrapped: boolean;
  sweeps: number;
  elapsedMs: number;
  errors: string[];
}

/**
 * Walk the next slice of connected users, one at a time, and record where we
 * stopped.
 *
 * Both nightly jobs share this because both had the same bug: a `for` loop
 * over every connected user inside one request under a 60-second cap. The
 * work per user is different — one syncs and scores, the other sends a mail —
 * but the shape of *not being able to finish* is identical, and so is the
 * correct fix.
 *
 * A user who throws still advances the cursor. Their broker being down must
 * not park the sweep in front of them for ever; they get another attempt next
 * time round, and the error comes back in the response.
 */
export async function sweep(
  job: string,
  visit: (userId: string) => Promise<void>,
  options: SweepOptions = {},
): Promise<SweepResult> {
  const batchSize = options.batch ?? 12;
  const budgetMs = options.budgetMs ?? 210_000;
  const clock = options.now ?? Date.now;

  const started = clock();
  const before = await cronState(job);
  const batch = await nextBatch(job, batchSize);

  /* An empty batch means the cursor is past the last user: wrap and stop. */
  if (batch.length === 0) {
    await saveCursor(job, null, true);
    return {
      job,
      visited: 0,
      wrapped: true,
      sweeps: before.sweeps + 1,
      elapsedMs: clock() - started,
      errors: [],
    };
  }

  const errors: string[] = [];
  let visited = 0;
  let last: string | null = null;

  for (const userId of batch) {
    if (clock() - started > budgetMs) break;
    try {
      await visit(userId);
    } catch (err) {
      errors.push(`${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    visited += 1;
    last = userId;
  }

  const wrapped = closesSweep(batchSize, batch.length, visited);
  if (last) await saveCursor(job, last, wrapped);

  return {
    job,
    visited,
    wrapped,
    sweeps: before.sweeps + (wrapped ? 1 : 0),
    elapsedMs: clock() - started,
    errors,
  };
}
