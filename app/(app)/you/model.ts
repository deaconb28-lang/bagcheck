import type { ConnectionAccount, HoldingRow } from "@/lib/db";
import type { RoundTrip } from "@/lib/score";

/**
 * What the dashboard has worked out, and how it says it.
 *
 * Pure: no I/O, no clock, no React. Everything the screen states about the
 * ledger is derived here so `page.tsx` is a list of blocks rather than a list
 * of blocks with a spreadsheet threaded through it — and so the arithmetic can
 * be read in one place, which is where a wrong figure hides.
 *
 * Nothing invents. Every function returns `null` where the ledger cannot
 * answer, and the block above it goes absent rather than printing a plausible
 * figure.
 */

/* ── How a figure is said ─────────────────────────────────────────────────── */

/** The tone a money figure wears. Undefined where there is no figure. */
export type MoneyTone = "moss" | "loss" | undefined;

/**
 * Colour reaches a figure only when the figure is money, and then it means one
 * thing each way. This was written out at seven call sites, which is seven
 * chances for one of them to disagree about what an absent number looks like.
 */
export function moneyTone(value: number | null | undefined): MoneyTone {
  return value == null ? undefined : value >= 0 ? "moss" : "loss";
}

/** "+11.9%" / "−4.0%". A real minus sign, one decimal, never a hyphen. */
export function signedPct(value: number): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;
}

/** "12 June" — a window's opening date, said the way a sentence would say it. */
export function monthDay(iso: string): string {
  const at = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(at.getTime())
    ? iso
    : at.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}

const ORDINALS = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];

/** "second". Past the words we have, the digits do the job. */
export function ordinal(place: number): string {
  return ORDINALS[place] ?? `${place}th`;
}

/** "Morning" / "Afternoon" / "Evening". The only clock read on this screen. */
export function greeting(now = new Date()): string {
  const hour = now.getUTCHours();
  return hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
}

/* ── What the book is worth ───────────────────────────────────────────────── */

export interface BookSummary {
  positions: number;
  totalValue: number;
  totalCost: number;
  /** Unrealised, as a percentage. Null when there is no cost basis to divide. */
  returnPct: number | null;
  /** Positions above water on the current mark. */
  winners: number;
  /** The largest name, for the sentence that names it. */
  largest: string | null;
}

/**
 * One pass, four answers. This was four traversals of the same array — three
 * reduces and a filter — which is three more than the work needs and, more to
 * the point, four places to forget the same `?? 0`.
 */
export function summariseBook(holdings: HoldingRow[]): BookSummary {
  let totalValue = 0;
  let totalCost = 0;
  let winners = 0;
  for (const holding of holdings) {
    totalValue += holding.value ?? 0;
    totalCost += holding.cost ?? 0;
    if ((holding.pnlPct ?? 0) > 0) winners += 1;
  }
  return {
    positions: holdings.length,
    totalValue,
    totalCost,
    returnPct: totalCost ? ((totalValue - totalCost) / totalCost) * 100 : null,
    winners,
    largest: holdings[0]?.symbol ?? null,
  };
}

export interface RealisedYear {
  amount: number;
  trips: number;
}

/**
 * Realised, off the round trips rather than off `dailyPnl`.
 *
 * `dailyPnl.realised` is the *cash amount* of every sell and dividend — the
 * proceeds, not the gain — so a reader who sold half a million dollars of
 * stock for a two-thousand-dollar profit would read "+$500,000" under a label
 * saying booked. A round trip carries the FIFO-matched `pnl`, which is the
 * figure the word means.
 */
export function realisedIn(trips: RoundTrip[], year: number): RealisedYear {
  const prefix = String(year);
  let amount = 0;
  let closed = 0;
  for (const trip of trips) {
    if (trip.closeDate.slice(0, 4) !== prefix) continue;
    amount += trip.pnl;
    closed += 1;
  }
  return { amount, trips: closed };
}

export interface YearWindow {
  /** The first mark inside the year. Null when the curve never reaches it. */
  opened: string | null;
  /**
   * Whether that mark is early enough to call the figure a year to date.
   *
   * A fund's year to date starts on the second of January. A reader whose
   * ledger starts in June has a six-month figure, and putting it in the same
   * unit as a twelve-month one is not a comparison — it is two measurements
   * drawn at one scale. The field goes absent in that case rather than
   * carrying a footnote; the standing figure stays and renames its own window,
   * because a shorter return is a perfectly good number and it is only the
   * label that would have been wrong.
   */
  sameWindow: boolean;
}

export function yearWindow(curve: Array<{ date: string }>, year: number): YearWindow {
  const opened = curve.find((point) => point.date.slice(0, 4) === String(year))?.date ?? null;
  return { opened, sameWindow: opened != null && opened <= `${year}-01-14` };
}

/** What the standing figure calls the window it actually measured. */
export function windowLabel({ opened, sameWindow }: YearWindow): string {
  return sameWindow || opened == null ? "Year to date" : `Since ${monthDay(opened)}`;
}

/* ── Sentences the ledger writes ──────────────────────────────────────────── */

/** ", across 2 accounts at Interactive Brokers and Fidelity" — or nothing. */
export function accountsClause(accounts: ConnectionAccount[] | undefined): string {
  if (!accounts?.length) return "";
  const counted = accounts.length === 1 ? "one account" : `${accounts.length} accounts`;
  const named =
    accounts
      .map((account) => account.institution)
      .filter(Boolean)
      .slice(0, 2)
      .join(" and ") || "your brokerage";
  return `, across ${counted} at ${named}`;
}

export interface SessionSummary {
  green: number;
  red: number;
  best: number | null;
  worst: number | null;
  total: number;
}

/**
 * What the P&L block says under its figure.
 *
 * The sentence and the figure answer to the same count, which they did not:
 * one closed session rendered "+$500" over "nothing has closed yet", which is
 * a screen disagreeing with itself.
 */
export function sessionsLede(
  sessions: Array<{ date: string }>,
  summary: SessionSummary,
  money: (value: number | null) => string,
): string {
  if (sessions.length > 1) {
    return `The last ${sessions.length} sessions that closed something — ${summary.green} green, ${summary.red} red. Best ${money(summary.best)}, worst ${money(summary.worst)}.`;
  }
  if (sessions.length === 1) {
    return `One session has closed something so far, on ${monthDay(sessions[0].date)}.`;
  }
  return "Nothing has closed yet. The chart draws itself the first time a position is sold.";
}

/** What each score component is measured against. */
export const COMPARISON: Record<string, string> = {
  adherence: "Against your own baseline.",
  consistency: "Sizing and cadence, week over week.",
  patience: "What you do in a drawdown.",
  exposure: "Inside your band.",
};
