export type StyleBaseline = "long-term" | "swing" | "active";

export type ContributorTone = "moss" | "signal" | "clay";

/**
 * Scores computed before the palette moved to green/blue stored "gold" and
 * "violet". They are still in Mongo and still render, so map them on read —
 * an unrecognised tone would paint a contributor bar with no fill at all.
 */
export function contributorTone(stored: string): ContributorTone {
  if (stored === "moss" || stored === "gold") return "moss";
  if (stored === "signal" || stored === "violet") return "signal";
  return "clay";
}

/** One ranked row of the decomposition — name, signed value, semantic tone. */
export interface Contributor {
  name: string;
  value: number;
  tone: ContributorTone;
}

/** The minimal transaction shape the scorer reads — no I/O types. */
export interface TxnLite {
  /** Trade date, ISO (date or datetime). */
  date: string | null;
  type: string | null;
  symbol: string | null;
  units: number | null;
  price: number | null;
  amount: number | null;
}

export interface ScoreComponents {
  adherence: number;
  consistency: number;
  patience: number;
  exposure: number;
}

export interface ScoreInput {
  /** Day being scored, YYYY-MM-DD. */
  date: string;
  baseline: StyleBaseline;
  /** Full history up to and including `date`. */
  transactions: TxnLite[];
}

export interface ScoreResult {
  date: string;
  baseline: StyleBaseline;
  score: number;
  components: ScoreComponents;
  contributors: Contributor[];
}

/** A FIFO-matched realized position: one buy lot consumed by one sell. */
export interface RoundTrip {
  symbol: string;
  openDate: string;
  closeDate: string;
  holdDays: number;
  pnl: number;
  notional: number;
}

export type TxnKind = "buy" | "sell" | "deposit" | "dividend" | "other";
