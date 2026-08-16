/**
 * Deciding when a stored price is too old to show — pure, so the rule is
 * testable without a network.
 *
 * The product's claim is that its numbers come from the brokerage. When a
 * mark is refreshed from somewhere else, the screen has to say so, which
 * means the decision has to be explicit rather than implicit in a fetch.
 */

export interface StoredMark {
  symbol: string;
  /** Price the brokerage last reported, if it reported one. */
  price: number | null;
  /** ISO date of the snapshot the price came from. */
  asOf: string | null;
}

export interface Quote {
  symbol: string;
  price: number;
  /** Finnhub's previous close, used for nothing but sanity checks. */
  previousClose: number | null;
}

export interface ResolvedMark {
  symbol: string;
  price: number | null;
  /** Where the number on screen actually came from. */
  source: "brokerage" | "market" | "none";
  /** True when the brokerage price was used despite being old. */
  stale: boolean;
}

/** A snapshot from today is current; anything older is worth refreshing. */
export function isStale(asOf: string | null, today: string): boolean {
  if (!asOf) return true;
  return asOf.slice(0, 10) < today.slice(0, 10);
}

/**
 * A quote that disagrees with the broker by more than this is not treated as
 * a correction — it usually means the symbol resolved to a different
 * instrument (a foreign listing, a renamed ticker). Showing it would make the
 * portfolio wrong in a way the user cannot see.
 */
const MAX_DISAGREEMENT = 0.5;

export function resolveMark(
  stored: StoredMark,
  quote: Quote | null,
  today: string,
): ResolvedMark {
  const stale = isStale(stored.asOf, today);

  if (quote && quote.price > 0) {
    const plausible =
      stored.price == null ||
      Math.abs(quote.price - stored.price) / stored.price <= MAX_DISAGREEMENT;

    // Only replace a stale mark, and only with a number that agrees.
    if (plausible && (stale || stored.price == null)) {
      return { symbol: stored.symbol, price: quote.price, source: "market", stale: false };
    }
  }

  if (stored.price != null) {
    return { symbol: stored.symbol, price: stored.price, source: "brokerage", stale };
  }
  return { symbol: stored.symbol, price: null, source: "none", stale };
}

export function resolveMarks(
  stored: StoredMark[],
  quotes: Map<string, Quote>,
  today: string,
): ResolvedMark[] {
  return stored.map((m) => resolveMark(m, quotes.get(m.symbol) ?? null, today));
}

/**
 * One mono line naming where the numbers came from. Descriptive: it reports
 * provenance and never suggests doing anything about it.
 */
export function provenanceLine(marks: ResolvedMark[], lastSync: string | null): string {
  const refreshed = marks.filter((m) => m.source === "market").length;
  const stale = marks.filter((m) => m.stale).length;
  const synced = lastSync ? `Brokerage synced ${lastSync}` : "Never synced";

  if (refreshed) {
    return `${synced} · ${refreshed} ${refreshed === 1 ? "mark" : "marks"} refreshed from market data`;
  }
  if (stale) {
    return `${synced} · ${stale} ${stale === 1 ? "mark is" : "marks are"} from that sync`;
  }
  return `${synced} · every mark is from that sync`;
}

/**
 * The same job for the comparison field: where those returns came from, what
 * kind of return they are, and how the reader's own figure was arrived at.
 *
 * It ends by saying the chart is shown for scale rather than as a rating,
 * because that is the read-only stance and it belongs in the mono strip beside
 * the numbers rather than in a note somewhere else. Descriptive throughout —
 * it never suggests doing anything about what it reports.
 */
export function fieldProvenance(funds: number, asOf: string | null): string {
  const when = asOf ? ` as of ${asOf}` : "";
  return [
    `${funds} ${funds === 1 ? "fund" : "funds"} from market data${when}`,
    "price return year to date",
    "your own figure is off your fills, with buys and sells taken out",
    "shown for scale, not rated",
  ].join(" · ");
}
