import assert from "node:assert/strict";
import test from "node:test";
import { bookFrom, patternsFrom, performanceFrom, windowFor } from "./view";
import type { Facts } from "./types";

const holding = (symbol: string, value: number, cost: number, pnlPct: number) => ({
  symbol,
  description: null,
  units: 1,
  price: value,
  cost,
  value,
  pnl: value - cost,
  pnlPct,
  pnlSource: "cost" as const,
});

const trip = (closeDate: string, pnl: number) => ({
  symbol: "NVDA",
  openDate: "2026-01-02",
  closeDate,
  holdDays: 30,
  pnl,
  notional: 1000,
});

const facts = (over: Partial<Facts> = {}): Facts => ({
  trips: [],
  sessions: [],
  curve: [],
  flows: { trades: [], transfers: [] },
  holdTime: { winnersMean: null, losersMean: null, winners: 0, losers: 0 },
  findings: [],
  holdings: [],
  accounts: [],
  syncedAt: null,
  provenance: { marks: "", asOf: null },
  excluded: [],
  transactionCount: 0,
  scoredDays: 0,
  investorAge: null,
  components: null,
  ...over,
});

test("the book is one pass over the positions", () => {
  const book = bookFrom([
    holding("NVDA", 600, 400, 50),
    holding("AAPL", 300, 350, -14),
    holding("MSFT", 100, 80, 25),
  ]);
  assert.equal(book.positions, 3);
  assert.equal(book.value, 1000);
  assert.equal(book.cost, 830);
  assert.equal(book.unrealised, 170);
  assert.equal(book.winners, 2);
  assert.equal(book.largest, "NVDA");
  assert.ok(Math.abs(book.topTwo - 0.9) < 1e-9);
});

test("a window is only comparable when it opens in January and the ledger reaches it", () => {
  assert.equal(windowFor("ytd", "2026-08-16", "2025-03-01").comparable, true);
  /* A ledger that starts in June has no year to date to compare. */
  assert.equal(windowFor("ytd", "2026-08-16", "2026-06-01").comparable, false);
  /* Forty-five days is never a year, however long the ledger is. */
  assert.equal(windowFor("45d", "2026-08-16", "2020-01-01").comparable, false);
});

test("a window slices the facts and nothing outside it counts", () => {
  const perf = performanceFrom(
    facts({
      sessions: [
        { date: "2026-01-05", amount: 900 },
        { date: "2026-08-01", amount: 100 },
        { date: "2026-08-02", amount: -40 },
      ],
      trips: [trip("2026-01-05", 900), trip("2026-08-01", 100), trip("2026-08-02", -40)],
    }),
    windowFor("45d", "2026-08-16", "2025-01-01"),
  );
  assert.equal(perf.sessions.length, 2);
  assert.equal(perf.realised, 60);
  assert.equal(perf.up, 1);
  assert.equal(perf.down, 1);
  assert.equal(perf.peak, 100);
  /* Two trips is not a win rate. */
  assert.equal(perf.winRate.pct, null);
  assert.equal(perf.winRate.trades, 2);
});

test("a purchase inside the window is not a gain", () => {
  const perf = performanceFrom(
    facts({
      curve: [
        { date: "2026-08-01", value: 1000, filled: true, withCash: false },
        { date: "2026-08-16", value: 2000, filled: false, withCash: false },
      ],
      flows: { trades: [{ date: "2026-08-10", amount: 1000 }], transfers: [] },
    }),
    windowFor("all", "2026-08-16", "2026-08-01"),
  );
  assert.equal(perf.gain, 0);
});

test("sharpe declines under a season of marks", () => {
  const short = Array.from({ length: 30 }, (_, i) => ({
    date: `2026-07-${String(i + 1).padStart(2, "0")}`,
    value: 1000 + i,
    filled: false,
    withCash: false,
  }));
  assert.equal(performanceFrom(facts({ curve: short }), windowFor("all", "2026-08-16", null)).sharpe, null);
});

test("the weekday pattern only speaks when one day is clearly worse", () => {
  /* 2026-08-03 is a Monday; the rest of that week follows. */
  const week = [
    trip("2026-08-03", -500),
    trip("2026-08-04", 200),
    trip("2026-08-05", 300),
  ];
  const found = patternsFrom(facts({ trips: week }), windowFor("all", "2026-08-16", null));
  const weekday = found.find((p) => p.kind === "weekday");
  assert.ok(weekday, "expected a weekday pattern");
  assert.match(weekday.title, /^Mondays/);
  assert.equal(weekday.impact, -500);
  assert.equal(weekday.tone, "loss");
});

test("a green worst day is not a pattern", () => {
  const found = patternsFrom(
    facts({ trips: [trip("2026-08-03", 100), trip("2026-08-04", 200), trip("2026-08-05", 300)] }),
    windowFor("all", "2026-08-16", null),
  );
  assert.equal(found.find((p) => p.kind === "weekday"), undefined);
});

test("the hold asymmetry reads in whichever direction it actually runs", () => {
  const cut = patternsFrom(
    facts({ holdTime: { winnersMean: 41, losersMean: 132, winners: 5, losers: 5 } }),
    windowFor("all", "2026-08-16", null),
  ).find((p) => p.kind === "holds");
  assert.ok(cut);
  assert.match(cut.title, /cut winners/);
  assert.equal(cut.tone, "loss");

  const held = patternsFrom(
    facts({ holdTime: { winnersMean: 132, losersMean: 41, winners: 5, losers: 5 } }),
    windowFor("all", "2026-08-16", null),
  ).find((p) => p.kind === "holds");
  assert.ok(held);
  assert.match(held.title, /hold winners/);
  assert.equal(held.tone, "moss");
});

test("a hold gap inside a tenth is not worth a sentence", () => {
  const found = patternsFrom(
    facts({ holdTime: { winnersMean: 100, losersMean: 105, winners: 5, losers: 5 } }),
    windowFor("all", "2026-08-16", null),
  );
  assert.equal(found.find((p) => p.kind === "holds"), undefined);
});

test("engine findings come through worst first", () => {
  const found = patternsFrom(
    facts({
      findings: [
        { key: "a", tag: "", sentence: "A", evidence: "", impact: -100 },
        { key: "b", tag: "", sentence: "B", evidence: "", impact: -900 },
        { key: "c", tag: "", sentence: "C", evidence: "", impact: 50 },
      ],
    }),
    windowFor("all", "2026-08-16", null),
  );
  assert.deepEqual(found.map((p) => p.key), ["b", "a", "c"]);
  assert.equal(found[2].tone, "moss");
});

test("an empty ledger produces an empty view rather than a plausible one", () => {
  const empty = facts();
  const perf = performanceFrom(empty, windowFor("45d", "2026-08-16", null));
  assert.equal(perf.ret, null);
  assert.equal(perf.gain, null);
  assert.equal(perf.sharpe, null);
  assert.equal(perf.winRate.pct, null);
  assert.deepEqual(perf.axis, []);
  assert.deepEqual(patternsFrom(empty, windowFor("all", "2026-08-16", null)), []);
});

/*
 * The book's unrealised P&L, which the dashboard now leads with for any account
 * that has not sold anything. It is summed from each holding's own figure
 * rather than taken as value less cost — a position the broker prices but will
 * not give a cost basis for contributes nothing to `cost`, so the subtraction
 * counted its whole market value as gain.
 */

const priced = (symbol: string, value: number, cost: number | null, pnl: number | null) => ({
  symbol,
  description: null,
  units: 1,
  price: value,
  cost,
  value,
  pnl,
  pnlPct: pnl != null && cost ? (pnl / cost) * 100 : null,
  pnlSource: (pnl == null ? null : cost != null ? "cost" : "broker") as "cost" | "broker" | null,
});

test("a holding with no cost basis does not read as pure profit", () => {
  const book = bookFrom([
    priced("NVDA", 1000, 800, 200),
    /* Broker prices it, will not say what it cost, reports no P&L either. */
    priced("SPAXX", 5000, null, null),
  ]);
  /* Value less cost would have said 5,200 — the money-market fund as gain. */
  assert.equal(book.unrealised, 200);
  assert.equal(book.cost, 800);
  assert.equal(book.priced, 1);
  assert.equal(book.winners, 1);
});

test("the broker's own figure counts toward the book", () => {
  const book = bookFrom([priced("NVDA", 1000, 800, 200), priced("GEV", 900, null, -50)]);
  assert.equal(book.unrealised, 150);
  assert.equal(book.priced, 2);
  assert.equal(book.winners, 1);
});

test("the percentage is against the cost that is known, never a partial one", () => {
  const book = bookFrom([priced("NVDA", 1000, 800, 200), priced("SPAXX", 5000, null, null)]);
  assert.equal(book.unrealisedPct, 25);
});

test("a book nothing can price states no percentage rather than a zero", () => {
  const book = bookFrom([priced("SPAXX", 5000, null, null)]);
  assert.equal(book.unrealisedPct, null);
  assert.equal(book.priced, 0);
  assert.equal(book.unrealised, 0);
});
