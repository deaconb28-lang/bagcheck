import type { LoginRedirectURI } from "snaptrade-typescript-sdk";
import { ensureIndexes, getCollections } from "@/lib/db";
import { rebuildDerived } from "@/lib/db/derived";
import { backfillScores } from "@/lib/db/scoring";
import { beginSync, failSync, finishSync, markPhase } from "@/lib/db/sync-progress";
import type { ConnectionDoc } from "@/lib/db";
import { getSnapTrade } from "./client";

const ACTIVITY_PAGE_SIZE = 1000;

/** Register the user with SnapTrade on first touch; idempotent afterwards. */
export async function ensureRegistered(userId: string): Promise<ConnectionDoc> {
  const { connections } = await getCollections();
  const existing = await connections.findOne({ userId });
  if (existing) return existing;

  const snaptrade = getSnapTrade();
  const res = await snaptrade.authentication.registerSnapTradeUser({ userId });
  const userSecret = res.data.userSecret;
  if (!userSecret) {
    throw new Error("SnapTrade registration returned no userSecret");
  }

  const doc: ConnectionDoc = {
    userId,
    snaptradeUserId: userId,
    snaptradeUserSecret: userSecret,
    accounts: [],
    createdAt: new Date(),
    lastSyncAt: null,
  };
  await connections.insertOne(doc);
  return doc;
}

/** Connection-portal URL for the read-only brokerage link flow. */
export async function getPortalUrl(userId: string, redirectUri: string): Promise<string> {
  const conn = await ensureRegistered(userId);
  const snaptrade = getSnapTrade();
  const res = await snaptrade.authentication.loginSnapTradeUser({
    userId: conn.snaptradeUserId,
    userSecret: conn.snaptradeUserSecret,
    customRedirect: redirectUri,
    connectionType: "read",
  });
  const url = (res.data as LoginRedirectURI).redirectURI;
  if (!url) {
    throw new Error("SnapTrade returned no connection-portal URL");
  }
  return url;
}

export interface SyncResult {
  date: string;
  accounts: number;
  positions: number;
  activities: number;
  skippedActivities: number;
}

/**
 * Pull accounts, positions, and full transaction history for a user into
 * MongoDB. Positions land as one snapshot per account per day; activities
 * upsert on {userId, externalId} so re-syncs are idempotent.
 */
export async function syncUser(userId: string): Promise<SyncResult> {
  const startedAt = Date.now();
  await ensureIndexes();
  await beginSync(userId);
  try {
    return await runSync(userId, startedAt);
  } catch (err) {
    await failSync(userId, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

async function runSync(userId: string, startedAt: number): Promise<SyncResult> {
  const { connections, transactions, positionSnapshots } = await getCollections();

  const conn = await connections.findOne({ userId });
  if (!conn) {
    throw new Error("No SnapTrade connection for this user — connect a brokerage first");
  }

  const snaptrade = getSnapTrade();
  const creds = { userId: conn.snaptradeUserId, userSecret: conn.snaptradeUserSecret };
  const date = new Date().toISOString().slice(0, 10);

  const accountsRes = await snaptrade.accountInformation.listUserAccounts(creds);
  const accounts = accountsRes.data ?? [];

  let positionsCount = 0;
  let activitiesCount = 0;
  let skippedActivities = 0;
  let earliestDate: string | null = null;

  /*
   * Positions first for every account, then history for every account.
   *
   * The two loops used to be one, interleaved per account. Splitting them
   * costs nothing — the same calls in a different order — and it is what lets
   * the onboarding dialog say "positions, then history" truthfully instead of
   * showing two meters that both crawl at once.
   */
  await markPhase(userId, "positions", { accountsTotal: accounts.length, accountsDone: 0 });

  for (const [index, account] of accounts.entries()) {
    const posRes = await snaptrade.accountInformation.getUserAccountPositions({
      ...creds,
      accountId: account.id,
    });
    const positions = posRes.data ?? [];
    positionsCount += positions.length;
    await positionSnapshots.updateOne(
      { userId, accountId: account.id, date },
      { $set: { userId, accountId: account.id, date, takenAt: new Date(), positions } },
      { upsert: true },
    );
    await markPhase(userId, "positions", { accountsDone: index + 1, positions: positionsCount });
  }

  await markPhase(userId, "history", { accountsDone: 0 });

  for (const [index, account] of accounts.entries()) {
    // Full history, paginated per account.
    for (let offset = 0; ; offset += ACTIVITY_PAGE_SIZE) {
      const actRes = await snaptrade.accountInformation.getAccountActivities({
        ...creds,
        accountId: account.id,
        offset,
        limit: ACTIVITY_PAGE_SIZE,
      });
      const page = actRes.data.data ?? [];
      if (page.length === 0) break;

      const ops = [];
      for (const activity of page) {
        if (!activity.id) {
          skippedActivities += 1;
          continue;
        }
        const tradeDate = activity.trade_date ?? null;
        if (tradeDate && (earliestDate === null || tradeDate < earliestDate)) {
          earliestDate = tradeDate;
        }
        ops.push({
          updateOne: {
            filter: { userId, externalId: activity.id },
            update: {
              $set: {
                userId,
                externalId: activity.id,
                accountId: account.id,
                date: tradeDate,
                settledAt: activity.settlement_date ?? null,
                type: activity.type ?? null,
                symbol:
                  activity.symbol?.symbol ?? activity.option_symbol?.ticker ?? null,
                units: activity.units ?? null,
                price: activity.price ?? null,
                amount: activity.amount ?? null,
                currency: activity.currency?.code ?? null,
                fee: activity.fee ?? null,
                institution: activity.institution ?? null,
                description: activity.description ?? null,
                raw: activity,
                syncedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }
      if (ops.length) {
        await transactions.bulkWrite(ops);
        activitiesCount += ops.length;
      }
      if (page.length < ACTIVITY_PAGE_SIZE) break;
    }
    await markPhase(userId, "history", {
      accountsDone: index + 1,
      transactions: activitiesCount,
      /*
       * Trade dates are ISO strings, so the lexicographic minimum is the
       * chronological one. Kept as the string the broker sent rather than a
       * parsed Date, because the closing line only ever renders it.
       */
      earliestDate: earliestDate?.slice(0, 10) ?? null,
    });
  }

  await connections.updateOne(
    { userId },
    {
      $set: {
        lastSyncAt: new Date(),
        accounts: accounts.map((account) => ({
          id: account.id,
          name: account.name ?? null,
          number: account.number ?? null,
          institution: account.institution_name ?? null,
        })),
      },
    },
  );

  /*
   * Rebuild the derived layer here, at the one point the ledger actually
   * changes. Everything downstream — the wave, round trips, hold times — then
   * reads a document instead of scanning, and a page view costs O(1).
   * A failure is logged, not thrown: the sync itself succeeded.
   */
  await markPhase(userId, "derive");
  await rebuildDerived(userId).catch((err) =>
    console.error("[sync] derived rebuild failed", err),
  );

  /*
   * And score it — every day of it, not just today.
   *
   * Scoring used to happen only in the nightly cron and behind a button on
   * /debug, so a brand-new account finished onboarding and got "No score yet".
   * Writing today's score fixed that screen but not the product: one document
   * is not a history, and the streak, the consistency grid, the weekly delta
   * and the cards gated on 14, 60 and 180 scored days were all still empty.
   * The ledger has always known what happened on those days.
   *
   * Logged rather than thrown, like the rebuild above: the sync itself
   * succeeded, and anything that failed to compute is recomputed tonight.
   */
  await backfillScores(userId).catch((err) =>
    console.error("[sync] score backfill failed", err),
  );

  await finishSync(userId, startedAt);

  return {
    date,
    accounts: accounts.length,
    positions: positionsCount,
    activities: activitiesCount,
    skippedActivities,
  };
}
