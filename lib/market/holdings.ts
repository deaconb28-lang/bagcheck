import type { HoldingRow } from "@/lib/db";
import { normalizeSymbol } from "@/lib/logos";
import { isStale, provenanceLine, resolveMarks } from "./marks";
import type { Quote, ResolvedMark, StoredMark } from "./marks";
import { profilesFor } from "./profiles";
import type { CompanyProfile } from "./profiles";
import { quotesFor } from "./quotes";

/**
 * Holdings, backchecked against market data.
 *
 * The brokerage stays the account of record: a quote may only correct a mark
 * the last sync already left behind, and a company name may only fill a gap
 * the brokerage left empty. Nothing here adds a row, a signal or an event.
 */

/** Pure: fold resolved marks back into the rows, recomputing what price feeds. */
export function repriceRows(rows: HoldingRow[], marks: ResolvedMark[]): HoldingRow[] {
  const bySymbol = new Map(marks.map((m) => [m.symbol, m]));
  return rows.map((row) => {
    const mark = bySymbol.get(row.symbol);
    if (!mark || mark.source !== "market" || mark.price == null) return row;

    const value = mark.price * row.units;
    const pnl = row.cost != null ? value - row.cost : null;
    const pnlPct = pnl != null && row.cost ? (pnl / row.cost) * 100 : null;
    return { ...row, price: mark.price, value, pnl, pnlPct };
  });
}

/** Pure: fill a missing description, never overwrite one the brokerage gave. */
export function nameRows(
  rows: HoldingRow[],
  names: Map<string, { name: string | null }>,
): HoldingRow[] {
  return rows.map((row) =>
    row.description ? row : { ...row, description: names.get(row.symbol)?.name ?? null },
  );
}

export interface RefreshedHoldings {
  rows: HoldingRow[];
  /** One mono line naming where the numbers came from. */
  provenance: string;
}

/**
 * Refresh what the last sync left stale. When every mark is from today this
 * spends nothing — the rate limit is for marks that are actually old.
 */
export async function refreshHoldings(
  rows: HoldingRow[],
  asOf: string | null,
  today: string,
): Promise<RefreshedHoldings> {
  const stored: StoredMark[] = rows.map((row) => ({
    symbol: row.symbol,
    price: row.price,
    asOf,
  }));

  const tickers = rows
    .map((row) => normalizeSymbol(row.symbol))
    .filter((s): s is string => s != null);

  const needsPrice = stored.some((m) => m.price == null) || isStale(asOf, today);
  const needsName = rows.some((row) => !row.description);

  const [quotes, profiles] = await Promise.all([
    needsPrice && tickers.length ? quotesFor(tickers) : new Map<string, Quote>(),
    needsName && tickers.length ? profilesFor(tickers) : new Map<string, CompanyProfile>(),
  ]);

  const marks = resolveMarks(stored, quotes, today);
  return {
    rows: nameRows(repriceRows(rows, marks), profiles),
    provenance: provenanceLine(marks, asOf),
  };
}
