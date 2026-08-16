import type { RoundTrip } from "@/lib/score";
import { wrappedStats } from "./stats";
import type { WrappedContext, WrappedStats } from "./stats";

/**
 * The sample year, for a visitor who has not connected anything.
 *
 * A ledger rather than a list of figures. Every number a demo card shows is
 * computed from the rows below by the same `wrappedStats` a real account goes
 * through — so the sample cannot drift from the product, and a change that
 * breaks a real reader's card breaks the demo's in the same commit. Typing the
 * finished strings would have been shorter and would have made this a mock of
 * the pipeline rather than a run of it.
 *
 * It is illustrative and it says so: `sampleWrapped` marks its context, the
 * page states it above the deck, and every card's provenance line is swapped
 * from the brokerage claim to "Example ledger" on the way to the screen. This
 * product's whole claim is that its numbers came off a brokerage, so a sample
 * that did not announce itself would be the one lie it cannot afford.
 *
 * Pure and deterministic — no clock, no randomness, no I/O.
 */

/* A quiet accumulator's year: steady contributions, one good name, one dip. */
const SHAPE = [
  /* month index, equity at the end of it */
  [0, 41_200], [1, 42_800], [2, 44_100], [3, 43_050], [4, 46_700], [5, 48_900],
  [6, 47_100], [7, 51_400], [8, 53_800], [9, 52_200], [10, 56_900], [11, 58_640],
] as const;

const day = (year: number, month: number, d = 1) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * A point every few days, interpolated between the month ends. The drawdown
 * and the recovery are read off this curve rather than declared, which is why
 * it needs more than twelve points to be read from.
 */
function equityFor(year: number): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  for (let m = 0; m < 12; m += 1) {
    const from = m === 0 ? 40_000 : SHAPE[m - 1][1];
    const to = SHAPE[m][1];
    for (const d of [1, 8, 15, 22]) {
      const t = (d - 1) / 28;
      out.push({ date: day(year, m, d), value: Math.round(from + (to - from) * t) });
    }
  }
  return out;
}

const TRIPS = (year: number): RoundTrip[] => [
  { symbol: "NVDA", openDate: day(year, 0, 15), closeDate: day(year, 7, 8), holdDays: 205, pnl: 4_180, notional: 6_400 },
  { symbol: "COST", openDate: day(year, 0, 8), closeDate: day(year, 11, 1), holdDays: 328, pnl: 1_960, notional: 9_100 },
  { symbol: "ASML", openDate: day(year, 2, 3), closeDate: day(year, 6, 19), holdDays: 138, pnl: 820, notional: 5_200 },
  { symbol: "SBUX", openDate: day(year, 4, 12), closeDate: day(year, 8, 2), holdDays: 112, pnl: -540, notional: 3_800 },
  { symbol: "VOO", openDate: day(year, 1, 2), closeDate: day(year, 10, 14), holdDays: 285, pnl: 2_240, notional: 12_000 },
];

/** Rows: a contribution on the first of each month, plus the trades above. */
function rowsFor(year: number) {
  const rows: Array<{ date: string; type: string; symbol: string | null; amount: number | null }> = [];
  for (let m = 0; m < 12; m += 1) {
    rows.push({ date: day(year, m, 1), type: "deposit", symbol: null, amount: 900 });
  }
  for (const t of TRIPS(year)) {
    rows.push({ date: t.openDate, type: "buy", symbol: t.symbol, amount: -t.notional });
    rows.push({ date: t.closeDate, type: "sell", symbol: t.symbol, amount: t.notional + t.pnl });
  }
  /* A busiest month, and some of it on days the book was down. */
  for (const d of [4, 9, 11, 16, 18, 23, 25]) {
    rows.push({ date: day(year, 9, d), type: "buy", symbol: "VOO", amount: -400 });
  }
  return rows;
}

/** Session P&L, so "bought on a red day" has red days to find. */
function pnlFor(year: number) {
  const out: Array<{ date: string; realised: number }> = [];
  for (let m = 0; m < 12; m += 1) {
    for (const d of [4, 9, 11, 16, 18, 23, 25]) {
      /* Deterministic alternation — no clock, no randomness. */
      const down = (m + d) % 3 === 0;
      out.push({ date: day(year, m, d), realised: down ? -180 - d * 4 : 120 + d * 3 });
    }
  }
  return out;
}

const HOLDINGS = [
  { symbol: "VOO", value: 18_400, sector: "Index" },
  { symbol: "NVDA", value: 11_900, sector: "Technology" },
  { symbol: "COST", value: 9_600, sector: "Consumer Staples" },
  { symbol: "ASML", value: 7_300, sector: "Technology" },
  { symbol: "SBUX", value: 4_200, sector: "Consumer Staples" },
  { symbol: "BRK.B", value: 3_800, sector: "Financials" },
  { symbol: "TSM", value: 3_440, sector: "Technology" },
];

export function sampleWrapped(year: number): { stats: WrappedStats; context: WrappedContext } {
  return wrappedStats({
    year,
    name: null,
    equity: equityFor(year),
    trips: TRIPS(year),
    rows: rowsFor(year),
    dailyPnl: pnlFor(year),
    holdings: HOLDINGS,
    archetype: { name: "The Steward", trait: "A written plan, run slowly and on schedule." },
    investorAge: 34,
    /* The index's year, so card 10 has something honest to sit beside. */
    indexReturn: 0.118,
    showDollars: false,
  });
}
