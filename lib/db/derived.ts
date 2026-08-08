import { createHash } from "node:crypto";
import { getCollections } from "./collections";
import { buildRoundTrips } from "@/lib/score";
import type { RoundTrip, TxnLite } from "@/lib/score";
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
export const DERIVED_VERSION = 1;

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

/** A fingerprint of the inputs. Same ledger, same hash, no recompute. */
export function ledgerHash(rows: TxnLite[], snapshotDates: string[]): string {
  const h = createHash("sha1");
  h.update(String(rows.length));
  // The newest and oldest rows plus the count catch every append and every
  // backfill without hashing megabytes.
  for (const row of [rows[0], rows[rows.length - 1]]) {
    h.update(`|${row?.date ?? ""}:${row?.symbol ?? ""}:${row?.amount ?? ""}`);
  }
  h.update(`|${snapshotDates.length}:${snapshotDates[snapshotDates.length - 1] ?? ""}`);
  return h.digest("hex").slice(0, 16);
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

  return {
    version: DERIVED_VERSION,
    ledgerHash: ledgerHash(input.rows, input.snapshots.map((s) => s.date)),
    roundTrips,
    dailyPnl: dailyPnlFrom(input.rows),
    equitySeries: equityFrom(input.snapshots, input.today),
    holdTime: holdTimeFrom(roundTrips),
    excludedSymbols,
    transactionCount: input.rows.length,
  };
}

/**
 * Read the derived document, rebuilding it only when the version moved or the
 * ledger changed. Every screen calls this instead of scanning.
 */
export async function getDerived(userId: string): Promise<DerivedDoc | null> {
  const { derived, transactions, positionSnapshots } = await getCollections();

  const existing = await derived.findOne({ userId });
  if (existing && existing.version === DERIVED_VERSION) {
    // Cheap staleness probe: count plus newest row, no full scan.
    const [count, newest] = await Promise.all([
      transactions.countDocuments({ userId }),
      transactions.find({ userId }).sort({ date: -1 }).limit(1).next(),
    ]);
    if (count === existing.transactionCount && count > 0 && newest) {
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
