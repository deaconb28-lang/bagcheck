import { createHash } from "node:crypto";
import { getCollections } from "./collections";
import { buildRoundTrips } from "@/lib/score";
import type { RoundTrip, TxnLite } from "@/lib/score";
import { eventSegments, findings } from "@/lib/engine";
import type { DerivedDoc } from "./types";

/**
 * The derived layer — everything a screen needs about a ledger, computed once
 * per sync instead of on every page view.
 *
 * Before this existed, four screens each pulled up to six thousand rows and
 * rebuilt every round trip on every navigation. That is fine at a thousand
 * rows and a timeout at forty thousand. Now a screen reads one document.
 *
 * Two keys carry the invalidation. `VERSION` is bumped by hand when the logic
 * below changes, which retires every stored document at once. `ledgerHash` is
 * a fingerprint of the inputs, so a user whose ledger has not moved recomputes
 * nothing at all.
 */

/** Bump when anything in this file changes shape or meaning. */
export const DERIVED_VERSION = 2;

export interface DailyPnl {
  date: string;
  realised: number;
}

export interface EquityPoint {
  date: string;
  value: number;
  /**
   * Forward-filled from the last real snapshot. Position snapshots only exist
   * on days a sync ran, so without this the equity curve is a picture of when
   * the user opened the app rather than of the market.
   */
  interpolated: boolean;
}

export interface HoldTime {
  winnersMean: number | null;
  losersMean: number | null;
  winners: number;
  losers: number;
}

/**
 * The five facts the fingerprint is made of.
 *
 * Split out because they can be read from five cheap indexed queries as well
 * as from a loaded ledger — which is the whole point of a fingerprint. It
 * existed as a whole-ledger function only, so nothing could afford to compare
 * it, so nothing did.
 */
export interface LedgerProbe {
  count: number;
  oldest: Pick<TxnLite, "date" | "symbol" | "amount"> | null;
  newest: Pick<TxnLite, "date" | "symbol" | "amount"> | null;
  /** Distinct snapshot *dates*, not documents — a day with three accounts is one. */
  snapshotDates: number;
  lastSnapshot: string | null;
}

/** A fingerprint of the inputs. Same ledger, same hash, no recompute. */
export function hashLedger(probe: LedgerProbe): string {
  const h = createHash("sha1");
  h.update(String(probe.count));
  // The newest and oldest rows plus the count catch every append and every
  // backfill without hashing megabytes.
  for (const row of [probe.oldest, probe.newest]) {
    h.update(`|${row?.date ?? ""}:${row?.symbol ?? ""}:${row?.amount ?? ""}`);
  }
  h.update(`|${probe.snapshotDates}:${probe.lastSnapshot ?? ""}`);
  return h.digest("hex").slice(0, 16);
}

/** The same fingerprint, taken off a ledger already in memory. */
export function ledgerHash(rows: TxnLite[], snapshotDates: string[]): string {
  return hashLedger({
    count: rows.length,
    oldest: rows[0] ?? null,
    newest: rows[rows.length - 1] ?? null,
    snapshotDates: snapshotDates.length,
    lastSnapshot: snapshotDates[snapshotDates.length - 1] ?? null,
  });
}

/** Realised P&L per session. A buy is not a result, so only sells and dividends count. */
export function dailyPnlFrom(rows: TxnLite[]): DailyPnl[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    const date = row.date?.slice(0, 10);
    if (!date || !row.amount) continue;
    const type = (row.type ?? "").toLowerCase();
    if (!type.includes("sell") && !type.includes("dividend")) continue;
    byDate.set(date, (byDate.get(date) ?? 0) + row.amount);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, realised]) => ({ date, realised }));
}

/**
 * Portfolio value per calendar day, forward-filled between snapshots and
 * marked where it was filled — so a screen can say which points the brokerage
 * actually reported.
 */
export function equityFrom(
  snapshots: Array<{ date: string; value: number }>,
  today: string,
): EquityPoint[] {
  if (!snapshots.length) return [];

  const byDate = new Map<string, number>();
  for (const s of snapshots) byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.value);
  const dates = [...byDate.keys()].sort();

  const out: EquityPoint[] = [];
  const cursor = new Date(`${dates[0]}T00:00:00Z`);
  const end = new Date(`${today}T00:00:00Z`);
  let last = byDate.get(dates[0])!;

  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    const real = byDate.get(iso);
    if (real != null) last = real;
    out.push({ date: iso, value: last, interpolated: real == null });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function holdTimeFrom(trips: RoundTrip[]): HoldTime {
  const winners = trips.filter((t) => t.pnl > 0);
  const losers = trips.filter((t) => t.pnl <= 0);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return {
    winnersMean: mean(winners.map((t) => t.holdDays)),
    losersMean: mean(losers.map((t) => t.holdDays)),
    winners: winners.length,
    losers: losers.length,
  };
}

/**
 * Symbols whose transaction stream disagrees with the position snapshot.
 *
 * A divergence means a corporate action, a transfer-in with no history, or a
 * gap in what the broker reported — in every case the FIFO round trips for
 * that name are wrong, so it is excluded from statistics rather than quietly
 * skewing them. The position itself still renders; only the inference stops.
 */
export function reconcile(
  rows: TxnLite[],
  heldUnits: Map<string, number>,
  epsilon = 0.01,
): string[] {
  const implied = new Map<string, number>();
  for (const row of rows) {
    if (!row.symbol || row.units == null) continue;
    const type = (row.type ?? "").toLowerCase();
    const sign = type.includes("buy") ? 1 : type.includes("sell") ? -1 : 0;
    if (!sign) continue;
    implied.set(row.symbol, (implied.get(row.symbol) ?? 0) + sign * Math.abs(row.units));
  }

  const excluded: string[] = [];
  for (const [symbol, units] of heldUnits) {
    const from = implied.get(symbol);
    if (from == null) {
      // Held with no buy on file at all — a transfer-in.
      excluded.push(symbol);
      continue;
    }
    const scale = Math.max(Math.abs(units), Math.abs(from), 1);
    if (Math.abs(from - units) / scale > epsilon) excluded.push(symbol);
  }
  return excluded.sort();
}

export interface BuildInput {
  rows: TxnLite[];
  snapshots: Array<{ date: string; value: number }>;
  heldUnits: Map<string, number>;
  today: string;
}

/** Pure. Everything the derived document holds, from the ledger alone. */
export function buildDerived(input: BuildInput): Omit<DerivedDoc, "userId" | "computedAt"> {
  const excludedSymbols = reconcile(input.rows, input.heldUnits);
  const excluded = new Set(excludedSymbols);
  // Round trips are the one place exclusion has to bite — a name whose units
  // do not reconcile produces hold times and P&L that never happened.
  const clean = input.rows.filter((r) => !r.symbol || !excluded.has(r.symbol));
  const roundTrips = buildRoundTrips(clean);
  const equitySeries = equityFrom(input.snapshots, input.today);

  return {
    version: DERIVED_VERSION,
    ledgerHash: ledgerHash(input.rows, input.snapshots.map((s) => s.date)),
    roundTrips,
    dailyPnl: dailyPnlFrom(input.rows),
    equitySeries,
    holdTime: holdTimeFrom(roundTrips),
    excludedSymbols,
    transactionCount: input.rows.length,
    // The ledger-only findings, with dollar impacts, ready for any screen.
    findings: [...findings(roundTrips, clean), ...eventSegments(equitySeries, roundTrips, clean)],
  };
}

/**
 * The fingerprint, taken without loading the ledger.
 *
 * Five indexed reads: the count, the two ends, and the snapshot dates. Each
 * is served by `{userId, date}` — the point is that this costs about as much
 * as the count alone did, so the check can afford to be the real one.
 *
 * Ties on the boundary date resolve consistently because Mongo walks the same
 * index forward here and in `rebuildDerived`, and reverses it for `newest`.
 * If that ever stopped holding, the cost is a rebuild that was not needed —
 * never a stale document served as fresh, which is the direction that matters.
 */
async function probeLedger(userId: string): Promise<LedgerProbe> {
  const { transactions, positionSnapshots } = await getCollections();
  const ends = { _id: 0, date: 1, symbol: 1, amount: 1 } as const;

  const [count, oldest, newest, dates] = await Promise.all([
    transactions.countDocuments({ userId }),
    transactions.find({ userId }).sort({ date: 1 }).limit(1).project<TxnLite>(ends).next(),
    transactions.find({ userId }).sort({ date: -1 }).limit(1).project<TxnLite>(ends).next(),
    positionSnapshots.distinct("date", { userId }),
  ]);

  const sorted = [...dates].sort();
  return {
    count,
    oldest,
    newest,
    snapshotDates: sorted.length,
    lastSnapshot: sorted[sorted.length - 1] ?? null,
  };
}

/**
 * Read the derived document, rebuilding it only when the version moved or the
 * ledger changed. Every screen calls this instead of scanning.
 *
 * The staleness check used to compare `transactionCount` and nothing else,
 * while `ledgerHash` was computed, stored, and never looked at — so a sync
 * that added a position snapshot without adding a transaction left the equity
 * curve frozen, which is every sync on an account that is not trading. The
 * hash covers both ends of the ledger and the snapshot dates, and it is the
 * comparison now.
 */
export async function getDerived(userId: string): Promise<DerivedDoc | null> {
  const { derived } = await getCollections();

  const existing = await derived.findOne({ userId });
  if (existing && existing.version === DERIVED_VERSION) {
    const probe = await probeLedger(userId);
    if (probe.count > 0 && existing.ledgerHash === hashLedger(probe)) {
      return existing;
    }
  }

  return rebuildDerived(userId);
}

export async function rebuildDerived(userId: string): Promise<DerivedDoc | null> {
  const { derived, transactions, positionSnapshots } = await getCollections();

  const rows = await transactions
    .find({ userId })
    .sort({ date: 1 })
    .project<TxnLite>({ _id: 0, date: 1, type: 1, symbol: 1, units: 1, price: 1, amount: 1 })
    .toArray();
  if (!rows.length) return null;

  const snapDocs = await positionSnapshots.find({ userId }).sort({ date: 1 }).toArray();

  const byDate = new Map<string, number>();
  const heldUnits = new Map<string, number>();
  const latestPerAccount = new Map<string, (typeof snapDocs)[number]>();
  for (const snap of snapDocs) {
    const value = (snap.positions ?? []).reduce(
      (sum, p) => sum + (p.price ?? 0) * (p.units ?? 0),
      0,
    );
    byDate.set(snap.date, (byDate.get(snap.date) ?? 0) + value);
    const current = latestPerAccount.get(snap.accountId);
    if (!current || snap.date > current.date) latestPerAccount.set(snap.accountId, snap);
  }
  for (const snap of latestPerAccount.values()) {
    for (const position of snap.positions ?? []) {
      const symbol = position.symbol?.symbol?.symbol;
      if (!symbol || !position.units) continue;
      heldUnits.set(symbol, (heldUnits.get(symbol) ?? 0) + position.units);
    }
  }

  const doc: DerivedDoc = {
    userId,
    computedAt: new Date(),
    ...buildDerived({
      rows,
      snapshots: [...byDate.entries()].map(([date, value]) => ({ date, value })),
      heldUnits,
      today: new Date().toISOString().slice(0, 10),
    }),
  };

  await derived.updateOne({ userId }, { $set: doc }, { upsert: true });
  return doc;
}
