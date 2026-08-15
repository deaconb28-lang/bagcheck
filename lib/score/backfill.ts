import { computeScore } from "./score";
import type { ScoreResult, StyleBaseline, TxnLite } from "./types";
import { DAY_MS, parseDay } from "./util";

/**
 * The score, backwards.
 *
 * `scoreUser` only ever wrote today's document, which meant a freshly
 * connected account held exactly one score no matter how deep its ledger ran,
 * and grew by one a day. Everything that reads a *history* of scores was
 * therefore empty on the screen that sells the product: the streak, the
 * consistency grid, the week-over-week delta, and the cards that need 14, 60
 * and 180 scored days — the last of which is the annual Wrapped card, so
 * nobody could reach it inside a year.
 *
 * The ledger already knows what happened on every one of those days. This
 * computes the score for each of them.
 *
 * **Each day is scored on what was known that day.** The ledger is sliced to
 * the day before `computeScore` sees it — not because the windowing functions
 * are careless (`inWindow` correctly excludes the future) but because
 * `patience` and `adherence` filter trips with `daysBetween(closeDate, asOf)`,
 * and `daysBetween` clamps a negative span to zero. A trip closing after `asOf`
 * would read as closing *today* and leak backwards into a score for a day it
 * had not happened on. Slicing removes the whole class of that mistake rather
 * than patching the two call sites.
 *
 * Pure. The caller supplies the ledger and stores what comes back.
 */

/** Every ISO day from `from` to `to`, inclusive. Empty if the range inverts. */
export function dateRange(from: string, to: string): string[] {
  const start = parseDay(from);
  const end = parseDay(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];

  const days: string[] = [];
  for (let t = start; t <= end; t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/** The earliest dated transaction, or null when none carries a date. */
export function earliestDate(txns: TxnLite[]): string | null {
  let earliest: string | null = null;
  for (const t of txns) {
    if (!t.date) continue;
    if (earliest === null || t.date < earliest) earliest = t.date;
  }
  return earliest;
}

export interface BackfillInput {
  transactions: TxnLite[];
  baseline: StyleBaseline;
  /** Inclusive ISO bounds. */
  from: string;
  to: string;
  /** Days already stored, which are skipped. `to` is always recomputed. */
  have?: ReadonlySet<string>;
}

/**
 * One score per day in the range.
 *
 * Days already in `have` are skipped so a second sync is cheap — except the
 * last day, which is always recomputed because that is the one the ledger just
 * changed underneath.
 *
 * The ledger is sorted once and walked with a moving index rather than
 * re-filtered per day: the FIFO rebuild inside `computeScore` is the expensive
 * part and there is no reason to pay for the scan as well.
 */
export function scoreRange(input: BackfillInput): ScoreResult[] {
  const days = dateRange(input.from, input.to);
  if (days.length === 0) return [];

  const dated = input.transactions
    .filter((t): t is TxnLite & { date: string } => Boolean(t.date))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const out: ScoreResult[] = [];
  const last = days[days.length - 1];
  let cursor = 0;

  for (const date of days) {
    while (cursor < dated.length && dated[cursor].date <= date) cursor += 1;

    /* The day the sync just touched is always recomputed. */
    if (input.have?.has(date) && date !== last) continue;

    out.push(
      computeScore({
        date,
        baseline: input.baseline,
        transactions: dated.slice(0, cursor),
      }),
    );
  }

  return out;
}
