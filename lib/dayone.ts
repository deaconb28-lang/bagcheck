import type { HoldingRow } from "@/lib/db/queries";

/**
 * ── What a first sync can already draw ──
 *
 * The dashboard gated most of itself on *our* history — a scored night, a
 * closed round trip, two days of equity marks — and on the day somebody
 * connects there is none of that, so the screen arrived with five empty
 * blocks in a row and read as half a product.
 *
 * That was gating on the wrong thing. **A first sync hands over the whole
 * transaction record**, often years of it, plus a fully priced positions
 * snapshot. Everything below is computed from those two and nothing else:
 * no model, no estimate, no projection, and every figure checkable against a
 * brokerage statement.
 *
 * What is *not* here is the set of things that genuinely need our own
 * history — the score, the archetype, realised P&L per day, a curve of
 * account value over time. Those stay absent and stay stated. This is the
 * difference between "we have not watched you yet" and "your broker has not
 * told us anything yet", which the screen had been treating as one condition.
 */

/** The rows `factsFor` already fetches, widened by one field. */
export interface LedgerRow {
  date: string;
  type: string;
  symbol?: string | null;
  amount: number | null;
}

const day = (iso: string) => iso.slice(0, 10);
const isBuy = (t: LedgerRow) => /buy/i.test(t.type);
const isSell = (t: LedgerRow) => /sell/i.test(t.type);
const isTrade = (t: LedgerRow) => isBuy(t) || isSell(t);

/**
 * ── Money in, over time ──
 *
 * Cumulative net invested: every buy adds what it cost, every sell takes back
 * what it returned. It is **not** an equity curve and must never be labelled
 * as one — it does not move when the market does, only when the reader does.
 * That is exactly why it is available on day one: it is a fact about their own
 * transactions rather than about prices we would have to have been watching.
 *
 * One point per day the ledger touched, in order. Fewer than two days of
 * activity is not a line, and returns empty rather than a dot.
 */
export function investedCurve(rows: LedgerRow[]): Array<{ date: string; value: number }> {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (!row.date || row.amount == null || !isTrade(row)) continue;
    const d = day(row.date);
    /*
     * The sign is taken from the *word*, never from the amount. Brokerages
     * disagree about whether a buy is a negative number or a positive number
     * of a negative kind, and a ledger that mixes both conventions would
     * otherwise produce a curve that wanders in both directions at random.
     */
    const size = Math.abs(row.amount);
    byDay.set(d, (byDay.get(d) ?? 0) + (isBuy(row) ? size : -size));
  }

  const days = [...byDay.keys()].sort();
  if (days.length < 2) return [];

  let total = 0;
  return days.map((date) => {
    total += byDay.get(date) ?? 0;
    return { date, value: total };
  });
}

/**
 * ── Every day you traded ──
 *
 * A count of trades per day, banded for a heat grid. This is the honest
 * day-one twin of the realised-P&L calendar: that one needs closes, this one
 * needs only that the brokerage remembers what you did, which it does going
 * back years.
 *
 * The bands are counts and the note says so, so nobody can read activity as
 * profit. No `dir` — a busy day is not an up day, and handing this grid a
 * direction would be the chart claiming something it cannot know.
 */
export function activityCalendar(
  rows: LedgerRow[],
  weeks = 26,
  today = new Date().toISOString().slice(0, 10),
): Array<{ date: string; level: 0 | 1 | 2 | 3 | 4; note?: string }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.date || !isTrade(row)) continue;
    counts.set(day(row.date), (counts.get(day(row.date)) ?? 0) + 1);
  }
  if (counts.size === 0) return [];

  const end = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(end)) return [];

  const out: Array<{ date: string; level: 0 | 1 | 2 | 3 | 4; note?: string }> = [];
  for (let i = weeks * 7 - 1; i >= 0; i -= 1) {
    const date = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    const n = counts.get(date) ?? 0;
    /*
     * Four steps on raw counts rather than on a percentile of the reader's
     * own distribution: a band that moves with the account would mean a
     * different thing for every reader and could not be compared to itself
     * across a year.
     */
    const level: 0 | 1 | 2 | 3 | 4 = n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4;
    out.push({
      date,
      level,
      note: n ? `${n} ${n === 1 ? "trade" : "trades"}` : undefined,
    });
  }
  return out;
}

/**
 * ── Unrealised, position by position ──
 *
 * The day-one stand-in for the daily P&L columns, and it is a different
 * measurement rather than a substitute for the same one: realised P&L is what
 * closing did, this is what holding has done so far. The caller labels it as
 * such — calling it P&L without the word "unrealised" would be the one thing
 * this screen must not do.
 *
 * Sorted by magnitude so the columns read largest-first from the zero line,
 * and a name with no cost basis on file is dropped rather than drawn at zero.
 */
export function positionColumns(
  holdings: HoldingRow[],
): Array<{ date: string; amount: number }> {
  return holdings
    .filter((h) => h.pnl != null && Number.isFinite(h.pnl))
    .sort((a, b) => Math.abs(b.pnl ?? 0) - Math.abs(a.pnl ?? 0))
    .map((h) => ({ date: h.symbol, amount: h.pnl as number }));
}

/**
 * ── Return on cost ──
 *
 * What the book is worth against what it cost, as a fraction. Real on day one
 * because both halves come off the same snapshot.
 *
 * **It is not a year-to-date return and must never be presented as one.** It
 * has no time in it: a position bought yesterday and one bought in 2019
 * contribute on the same terms. Every surface that draws it beside a fund's
 * year says which is which — the honest use is "here is a real figure on a
 * stated basis", not "here is the same measurement".
 *
 * Null unless the broker priced enough of the book to mean anything: under
 * three quarters of market value carrying a cost basis, the figure describes
 * a fraction of an account while looking like it describes all of it.
 */
export function returnOnCost(holdings: HoldingRow[]): number | null {
  let cost = 0;
  let value = 0;
  let priced = 0;
  let total = 0;
  for (const h of holdings) {
    total += h.value ?? 0;
    if (h.cost == null || h.value == null || h.cost <= 0) continue;
    cost += h.cost;
    value += h.value;
    priced += h.value;
  }
  if (cost <= 0 || total <= 0) return null;
  if (priced / total < 0.75) return null;
  return value / cost - 1;
}
