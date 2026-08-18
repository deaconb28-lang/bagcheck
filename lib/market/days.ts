/**
 * Market days between two dates.
 *
 * Weekdays, counted from the day *after* `from` up to and including `to` —
 * the day you connect is not a day you have been connected for.
 *
 * **It does not know about holidays, and that is stated rather than hidden.**
 * A real exchange calendar is a table that has to be maintained per year and
 * per venue, and getting it wrong silently would mean an unlock landing a day
 * early. Weekdays over-count by at most a handful of days a year, so the
 * error is always in the direction of the reader waiting slightly longer than
 * a true market count would ask — which is the safe direction for a gate that
 * exists to stop a claim being made too early.
 *
 * Pure, like everything else in this directory that is not `client.ts`.
 */
export function marketDaysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  if (end <= start) return 0;

  let days = 0;
  for (let t = start + 86_400_000; t <= end; t += 86_400_000) {
    const weekday = new Date(t).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

/**
 * How long the reader has to have been connected before the patterns screen
 * will say anything about them.
 *
 * Ten market days is about a fortnight of calendar, and it is a *time* gate
 * rather than an activity one on purpose: it is reachable by every account,
 * including one that holds and never trades, so nobody is left permanently
 * short of a screen the product sells.
 *
 * It sits above the engine's own sample floors rather than replacing them. A
 * finding still refuses to report below its own sample count — this only stops
 * the screen making its first claim about someone in the week they arrived,
 * when the ledger it is reading is mostly a single opening snapshot.
 */
export const INSIGHTS_MARKET_DAYS = 10;

export interface InsightsGate {
  unlocked: boolean;
  /** Market days on the clock so far. */
  have: number;
  /** How many are left, zero once open. */
  left: number;
}

export function insightsGate(
  connectedAt: Date | null | undefined,
  now: Date,
  need = INSIGHTS_MARKET_DAYS,
): InsightsGate {
  /* No connection is not "zero days in" — there is no clock running at all,
   * and the screen behind this says "connect a brokerage" rather than "wait". */
  if (!connectedAt) return { unlocked: false, have: 0, left: need };
  const have = marketDaysBetween(connectedAt, now);
  return { unlocked: have >= need, have, left: Math.max(0, need - have) };
}
