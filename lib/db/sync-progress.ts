import { getCollections } from "./collections";
import type { SyncProgressDoc } from "./types";
import type { SyncPhase, SyncProgress } from "@/lib/snaptrade/progress";

/**
 * The status board one sync run writes and the onboarding dialog reads.
 *
 * Every write here is fire-and-forget from the sync's point of view: a
 * progress update that fails must never take down the sync it is describing.
 * That is why each function swallows its own error — the worst case is a
 * dialog that stops moving while the work behind it completes, which is
 * strictly better than a sync that dies because a status write timed out.
 */

async function write(userId: string, patch: Partial<SyncProgressDoc>): Promise<void> {
  try {
    const { syncProgress } = await getCollections();
    await syncProgress.updateOne({ userId }, { $set: patch }, { upsert: true });
  } catch (err) {
    console.error("[sync-progress] write failed", err);
  }
}

/** Reset the board for a fresh run. Overwrites whatever the last one left. */
export async function beginSync(userId: string): Promise<void> {
  await write(userId, {
    userId,
    phase: "accounts",
    status: "running",
    error: null,
    accountsTotal: 0,
    accountsDone: 0,
    positions: 0,
    transactions: 0,
    earliestDate: null,
    startedAt: new Date(),
    finishedAt: null,
    elapsedMs: null,
  });
}

/** Move to a phase and fold in whatever counts the sync has reached. */
export async function markPhase(
  userId: string,
  phase: SyncPhase,
  counts: Partial<Pick<SyncProgressDoc, "accountsTotal" | "accountsDone" | "positions" | "transactions" | "earliestDate">> = {},
): Promise<void> {
  await write(userId, { phase, status: "running", ...counts });
}

export async function finishSync(userId: string, startedAt: number): Promise<void> {
  const finishedAt = new Date();
  await write(userId, {
    phase: "derive",
    status: "done",
    finishedAt,
    elapsedMs: finishedAt.getTime() - startedAt,
  });
}

export async function failSync(userId: string, message: string): Promise<void> {
  await write(userId, { status: "failed", error: message, finishedAt: new Date() });
}

/**
 * What the dialog polls. Returns null when no run has ever been recorded —
 * the caller shows nothing rather than an empty checklist.
 */
export async function getSyncProgress(userId: string): Promise<SyncProgress | null> {
  const { syncProgress } = await getCollections();
  const doc = await syncProgress.findOne({ userId });
  if (!doc) return null;
  return {
    phase: doc.phase,
    status: doc.status,
    error: doc.error,
    accountsTotal: doc.accountsTotal,
    accountsDone: doc.accountsDone,
    positions: doc.positions,
    transactions: doc.transactions,
    earliestDate: doc.earliestDate,
    elapsedMs: doc.elapsedMs,
  };
}
