/**
 * Return over a window, and the field it gets compared against.
 *
 * Pure, so what the dashboard claims is testable without a database and
 * without a network. Nothing here invents a figure: every function returns
 * `null` where the ledger cannot answer, and the screen then omits the block
 * rather than printing a plausible one.
 *
 * **Why Modified Dietz and not end-over-start.** The Wrapped card measures a
 * year as first mark to last mark on the equity curve, which is the right
 * answer for a card about *how the account grew*. It is the wrong answer the
 * moment the figure sits next to a fund's return, because money moving in
 * moves the curve without anybody earning anything — a reader who paid in half
 * their balance in March would out-run every fund on the row and the chart
 * would be a lie about the one thing it exists to say. Modified Dietz takes
 * the flows out and weights each by how long the money was actually working,
 * which is the standard way a return is stated when the flows are known and
 * the daily valuations are not.
 *
 * **The flows are buys and sells, not deposits and withdrawals, and that is
 * not a shortcut.** The curve this measures is built from position snapshots —
 * `Σ price × units` — so it is the value of the *book*, and a brokerage's cash
 * balance is not in it. Netting a deposit out of a curve that never saw the
 * cash is the worst possible answer: money arrives, the curve does not move,
 * and the arithmetic reports the whole contribution as a loss. What actually
 * moves this curve other than the market is money crossing into and out of
 * positions, which is exactly what a buy and a sell are. So the figure this
 * produces is the return on the invested book: deposit and leave it in cash
 * and nothing happens to it, invest the deposit and the buy is netted out, sell
 * into cash and the sale is netted out.
 *
 * It is therefore a *price* return — a dividend paid in cash leaves the book
 * unchanged and is not counted — which is the same kind of figure the funds it
 * gets compared against are quoted on. Two different kinds of return drawn at
 * one scale is the failure this whole file exists to avoid.
 *
 * Where no flow is on file it degrades to exactly end-over-start, so an account
 * that only ever held reads the same as it always did.
 */

export interface CurveMark {
  date: string;
  value: number;
  /**
   * Forward-filled from an earlier snapshot rather than reported on the day.
   * Load-bearing at the opening mark: a filled mark cannot contain anything
   * that happened on its own date, so a trade dated that day is a flow. A real
   * snapshot already holds it, and counting it again would double it.
   */
  interpolated?: boolean;
}

/** Money crossing into or out of positions. Positive is a purchase. */
export interface Flow {
  date: string;
  amount: number;
}

const DAY = 86_400_000;

const day = (date: string): number => Date.parse(`${date.slice(0, 10)}T00:00:00Z`);

/**
 * Money crossing into and out of positions, off the ledger's own rows.
 *
 * The direction comes from the word, never from the sign: brokerages disagree
 * about whether a sale is a negative amount or a positive amount of a negative
 * kind, and a return that flips on that convention is a return that flips per
 * brokerage.
 *
 * Dividends are deliberately not flows. A dividend paid in cash does not touch
 * the book this measures, and one paid in stock arrives as a purchase — either
 * way there is nothing here to correct.
 */
export function investmentFlows(
  rows: Array<{ date: string; type: string; amount: number | null }>,
): Flow[] {
  const out: Flow[] = [];
  for (const row of rows) {
    if (!row.date || row.amount == null || !Number.isFinite(row.amount)) continue;
    const type = row.type ?? "";
    const bought = /buy/i.test(type);
    const sold = /sell/i.test(type);
    /* A row that is both, or neither, is not something to net out. */
    if (bought === sold) continue;
    const size = Math.abs(row.amount);
    if (size === 0) continue;
    out.push({ date: row.date.slice(0, 10), amount: bought ? size : -size });
  }
  return out;
}

/**
 * Modified Dietz over a window, as a fraction — 0.184 for +18.4%.
 *
 * The window is the curve itself: its first mark opens the period and its last
 * closes it. Flows before the opening mark are already inside the opening
 * value and are dropped rather than counted twice.
 *
 * **A flow dated *on* the opening mark depends on what that mark is.** For any
 * account with prior history the first mark of a year is the second of
 * January, forward-filled from December's snapshot — which cannot possibly
 * contain a trade placed that day, so the trade is a flow at full weight, the
 * textbook treatment. Where the opening mark is a real snapshot it already
 * holds the day's trades, and counting them again would report a purchase as a
 * gain. Dropping both cases, which is the tidier-looking rule, prints "+50.0%"
 * for an account that only paid money in on the first of the year.
 */
export function periodReturn(curve: CurveMark[], flows: Flow[] = []): number | null {
  if (curve.length < 2) return null;

  const open = curve[0];
  const close = curve[curve.length - 1];
  const start = day(open.date);
  const end = day(close.date);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const span = (end - start) / DAY;
  if (span <= 0) return null;

  /* A filled opening mark holds nothing of its own day; a real one holds it all. */
  const from = open.interpolated === false ? start + 1 : start;

  let net = 0;
  let weighted = 0;
  for (const flow of flows) {
    const at = day(flow.date);
    if (!Number.isFinite(at) || at < from || at > end) continue;
    net += flow.amount;
    weighted += flow.amount * ((end - at) / DAY / span);
  }

  const base = open.value + weighted;
  /*
   * The denominator is what the money actually had to work with. At or below
   * zero there is nothing for a percentage to be a percentage *of* — an empty
   * account funded on the closing day, or one whose withdrawals outweigh what
   * was ever in it — so the figure is absent and the row does not appear.
   * An account funded from nothing earlier in the window is fine and reads as
   * the zero it is: money arrived, none of it was earned.
   */
  if (!(base > 0)) return null;

  const gain = close.value - open.value - net;
  const fraction = gain / base;
  return Number.isFinite(fraction) ? fraction : null;
}

/** The slice of a curve that falls inside one calendar year, oldest first. */
export function inYear<T extends { date: string }>(points: T[], year: number): T[] {
  const y = String(year);
  return points
    .filter((p) => p.date.slice(0, 4) === y)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The reader's year to date, on the same arithmetic the comparison field is
 * quoted on. Null until the curve has two marks inside the year.
 */
export function ytdReturn(curve: CurveMark[], flows: Flow[], year: number): number | null {
  return periodReturn(inYear(curve, year), inYear(flows, year));
}

export interface RaceEntry {
  key: string;
  /** What the row is called. A fund's ticker, or the reader. */
  label: string;
  /** What it does, in five words. Never a recommendation. */
  note: string;
  /** Year to date, as a fraction. */
  value: number;
  /** The reader's own row. Exactly one, when their return is known. */
  you?: boolean;
}

export interface RaceField {
  rows: RaceEntry[];
  /** 1-based, where the reader's row landed. Null when they have no figure. */
  place: number | null;
  /** How many rows are in the field, the reader included. */
  of: number;
  /** The gap to the row above the reader, as a fraction. Null when leading. */
  behind: number | null;
}

/**
 * The field, ordered and placed.
 *
 * Descending, because a race is read from the front. A peer whose return the
 * provider would not state is dropped rather than drawn at zero: a fund
 * missing from the chart is honest, and a fund flat on the line is a claim
 * nobody made.
 */
export function raceField(you: number | null, peers: RaceEntry[]): RaceField | null {
  const field = [
    ...peers.filter((p) => Number.isFinite(p.value)),
    ...(you != null && Number.isFinite(you)
      ? [{ key: "you", label: "You", note: "Your own book, year to date.", value: you, you: true }]
      : []),
  ].sort((a, b) => b.value - a.value);

  if (field.length < 2) return null;

  const index = field.findIndex((r) => r.you);
  const above = index > 0 ? field[index - 1] : null;

  return {
    rows: field,
    place: index < 0 ? null : index + 1,
    of: field.length,
    behind: above && index >= 0 ? above.value - field[index].value : null,
  };
}
