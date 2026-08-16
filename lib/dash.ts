import type { RoundTrip } from "@/lib/score";
import type { CurveMark, Flow } from "@/lib/returns";
import { periodReturn } from "@/lib/returns";

/**
 * The dashboard's figures, computed once and here.
 *
 * Pure — no I/O, no clock, no React — so every number the screen prints can be
 * asserted without a database. Nothing invents: each function returns `null`
 * or an empty result where the ledger cannot answer, and the block above it
 * goes absent rather than printing a plausible figure.
 *
 * **Realised P&L comes off round trips, never off `dailyPnl`.** The derived
 * document's `dailyPnl[].realised` is the *cash amount* of every sell and
 * dividend — the proceeds, not the gain — so a reader who sold half a million
 * dollars of stock for a two-thousand-dollar profit reads "+$500,000". A round
 * trip carries the FIFO-matched `pnl`, which is what the word means, and every
 * figure in this file that says realised is built from those.
 */

export interface Session {
  date: string;
  /** Realised P&L that session, FIFO matched. */
  amount: number;
}

/**
 * Realised P&L per session, oldest first — one entry per day that closed
 * something. A day that closed nothing is not a zero, it is not a day: the
 * chart is of sessions with a result, and padding it with flat days would
 * claim the reader traded on days they did not.
 */
export function dailyRealised(trips: RoundTrip[]): Session[] {
  const byDate = new Map<string, number>();
  for (const trip of trips) {
    const date = trip.closeDate.slice(0, 10);
    if (!date) continue;
    byDate.set(date, (byDate.get(date) ?? 0) + trip.pnl);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount }));
}

export interface SessionSpread {
  up: number;
  down: number;
  total: number;
  /** The largest absolute move in the window — what the columns scale against. */
  peak: number;
}

export function spread(sessions: Session[]): SessionSpread {
  let up = 0;
  let down = 0;
  let total = 0;
  let peak = 0;
  for (const session of sessions) {
    if (session.amount > 0) up += 1;
    else if (session.amount < 0) down += 1;
    total += session.amount;
    const size = Math.abs(session.amount);
    if (size > peak) peak = size;
  }
  return { up, down, total, peak: peak || 1 };
}

export interface WinRate {
  wins: number;
  trades: number;
  /** 0–100. Null below the floor, because three trades is not a rate. */
  pct: number | null;
}

/** The floor. Under this a percentage is a coincidence with a decimal point. */
const RATE_FLOOR = 10;

export function winRate(trips: RoundTrip[]): WinRate {
  const wins = trips.filter((trip) => trip.pnl > 0).length;
  const trades = trips.length;
  return {
    wins,
    trades,
    pct: trades >= RATE_FLOOR ? Math.round((wins / trades) * 100) : null,
  };
}

/**
 * Annualised Sharpe off the equity curve's own daily marks.
 *
 * A defined calculation rather than a vibe: daily simple returns between
 * consecutive marks, mean over standard deviation, scaled by √252. The
 * risk-free rate is taken as zero and the screen says so — folding in a rate
 * we do not have a source for would make the figure unverifiable, which is the
 * one thing it must not be.
 *
 * Null under a season of marks. A ratio computed from three weeks is noise
 * wearing two decimal places, and it would go on screen beside figures that
 * are not.
 */
const SHARPE_FLOOR = 60;

export function sharpe(curve: CurveMark[]): number | null {
  if (curve.length < SHARPE_FLOOR) return null;

  const returns: number[] = [];
  for (let i = 1; i < curve.length; i += 1) {
    const prev = curve[i - 1].value;
    if (!(prev > 0)) continue;
    returns.push((curve[i].value - prev) / prev);
  }
  if (returns.length < SHARPE_FLOOR) return null;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const sd = Math.sqrt(variance);
  if (!(sd > 0)) return null;

  const value = (mean / sd) * Math.sqrt(252);
  return Number.isFinite(value) ? value : null;
}

export interface PeriodMove {
  /** Money made over the window, with flows taken out. Null when unknowable. */
  gain: number | null;
  /** The same move as a fraction. */
  pct: number | null;
}

/**
 * What the window actually moved, in dollars and as a percentage.
 *
 * The dollars are the same numerator Modified Dietz divides: close minus open
 * minus what was paid in. Reporting the raw change in portfolio value would
 * count a deposit as a gain, which is the arithmetic this codebase spent a
 * whole module refusing to do.
 */
export function periodMove(curve: CurveMark[], flows: Flow[]): PeriodMove {
  if (curve.length < 2) return { gain: null, pct: null };

  const open = curve[0];
  const close = curve[curve.length - 1];
  const from = Date.parse(`${open.date}T00:00:00Z`);
  const to = Date.parse(`${close.date}T00:00:00Z`);

  let net = 0;
  for (const flow of flows) {
    const at = Date.parse(`${flow.date}T00:00:00Z`);
    if (!Number.isFinite(at) || at < from || at > to) continue;
    net += flow.amount;
  }

  return { gain: close.value - open.value - net, pct: periodReturn(curve, flows) };
}

/** The five sessions of a trading week, Monday first. */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export interface WeekdayCell {
  /** "Mon". */
  day: (typeof WEEKDAYS)[number];
  /** Realised P&L closed on that weekday, across the window. */
  amount: number;
  trades: number;
}

/**
 * Realised P&L by weekday — the shape behind "Mondays cost you".
 *
 * Weekends are dropped rather than shown empty: a market that is shut is not a
 * weekday that went badly. A weekday with no closed trip stays in the row at
 * zero, because the point of the chart is which day is the outlier and a
 * missing column would hide one.
 */
export function weekdayPnl(trips: RoundTrip[]): WeekdayCell[] {
  const cells: WeekdayCell[] = WEEKDAYS.map((day) => ({ day, amount: 0, trades: 0 }));
  for (const trip of trips) {
    const at = new Date(`${trip.closeDate.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(at.getTime())) continue;
    /* getUTCDay is Sunday-0; the trading week starts on Monday. */
    const index = at.getUTCDay() - 1;
    if (index < 0 || index > 4) continue;
    cells[index].amount += trip.pnl;
    cells[index].trades += 1;
  }
  return cells;
}

/** The worst weekday, when one is clearly worse. Null when nothing stands out. */
export function worstWeekday(cells: WeekdayCell[]): WeekdayCell | null {
  const traded = cells.filter((cell) => cell.trades > 0);
  if (traded.length < 3) return null;
  const worst = traded.reduce((low, cell) => (cell.amount < low.amount ? cell : low));
  return worst.amount < 0 ? worst : null;
}

export interface HoldSplit {
  winners: number | null;
  losers: number | null;
  /**
   * How much longer the longer-held side is held, always ≥ 1. Null unless both
   * sides exist, and null when the gap is inside a tenth — "1.0× faster" is a
   * sentence about nothing.
   */
  ratio: number | null;
  /**
   * Which way the asymmetry runs. `cuts-winners` is the leak everyone means;
   * `holds-winners` is the same measurement coming out the good way, and a
   * screen that only knows how to phrase the first one will print a sentence
   * that contradicts its own chart.
   */
  direction: "cuts-winners" | "holds-winners" | null;
}

/** Mean hold in days, winners against losers — the asymmetry, stated once. */
export function holdSplit(winnersMean: number | null, losersMean: number | null): HoldSplit {
  if (winnersMean == null || losersMean == null || winnersMean <= 0 || losersMean <= 0) {
    return { winners: winnersMean, losers: losersMean, ratio: null, direction: null };
  }
  const cuts = losersMean > winnersMean;
  const ratio = cuts ? losersMean / winnersMean : winnersMean / losersMean;
  if (ratio < 1.1) {
    return { winners: winnersMean, losers: losersMean, ratio: null, direction: null };
  }
  return {
    winners: winnersMean,
    losers: losersMean,
    ratio,
    direction: cuts ? "cuts-winners" : "holds-winners",
  };
}
