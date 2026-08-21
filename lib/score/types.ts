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

/**
 * The four components — and each one is `null` until the ledger can measure it.
 *
 * They used to be numbers unconditionally, and every component carried a
 * neutral fallback for the case where it had no evidence: consistency 72,
 * patience 72, exposure 88, adherence about 78. An account that had connected
 * and simply held its positions therefore scored **76 with all four above the
 * bar**, was told "all four components sit above the line at once", and was
 * handed a confident archetype — off a ledger that had proved none of it.
 *
 * That is the exact failure this codebase refuses everywhere else: absent
 * rather than defaulted. A neutral default is not a reading, it is a number
 * shaped like one, and a reader cannot tell them apart.
 */
export interface ScoreComponents {
  adherence: number | null;
  consistency: number | null;
  patience: number | null;
  exposure: number | null;
}

/** The four, in the order every surface draws them. */
export const COMPONENT_KEYS = ["adherence", "consistency", "patience", "exposure"] as const;

/** How many of the four the ledger could actually measure. */
export function measuredCount(components: ScoreComponents): number {
  return COMPONENT_KEYS.filter((k) => components[k] != null).length;
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
  /**
   * How many of the four the score was actually computed from. Stored, because
   * a screen has to be able to say "3 of 4 measured" without re-deriving it,
   * and a stored row from before this existed reads as `undefined` rather than
   * as a lie.
   */
  measured: number;
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
