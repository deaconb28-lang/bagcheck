import assert from "node:assert/strict";
import { test } from "node:test";
import { activityCalendar, investedCurve, positionColumns, returnOnCost } from "./dayone";
import type { LedgerRow } from "./dayone";
import type { HoldingRow } from "@/lib/db/queries";

const buy = (date: string, amount = 1000, symbol = "AAA"): LedgerRow => ({
  date,
  type: "BUY",
  symbol,
  amount: -amount,
});
const sell = (date: string, amount = 1000, symbol = "AAA"): LedgerRow => ({
  date,
  type: "SELL",
  symbol,
  amount,
});

const hold = (over: Partial<HoldingRow> & { symbol: string }): HoldingRow => ({
  description: over.symbol,
  units: 1,
  price: null,
  cost: null,
  value: null,
  pnl: null,
  pnlPct: null,
  pnlSource: null,
  ...over,
});

/* ── Money in ─────────────────────────────────────────────────────────── */

test("one day of activity is not a line", () => {
  assert.deepEqual(investedCurve([buy("2026-08-20")]), []);
  assert.deepEqual(investedCurve([buy("2026-08-20"), buy("2026-08-20", 500)]), []);
});

test("invested is cumulative, and a sell takes money back out", () => {
  const curve = investedCurve([buy("2026-01-02", 1000), buy("2026-02-02", 500), sell("2026-03-02", 300)]);
  assert.deepEqual(curve, [
    { date: "2026-01-02", value: 1000 },
    { date: "2026-02-02", value: 1500 },
    { date: "2026-03-02", value: 1200 },
  ]);
});

test("the direction comes from the word, never the sign", () => {
  /* A broker that reports buys as positive must not invert the curve. */
  const positiveBuys: LedgerRow[] = [
    { date: "2026-01-02", type: "BUY", symbol: "A", amount: 1000 },
    { date: "2026-02-02", type: "BUY", symbol: "A", amount: 500 },
  ];
  assert.deepEqual(investedCurve(positiveBuys), [
    { date: "2026-01-02", value: 1000 },
    { date: "2026-02-02", value: 1500 },
  ]);
});

test("dividends and transfers are not investment", () => {
  const rows: LedgerRow[] = [
    buy("2026-01-02", 1000),
    { date: "2026-01-03", type: "DIVIDEND", symbol: "A", amount: 12 },
    { date: "2026-01-04", type: "DEPOSIT", symbol: null, amount: 5000 },
    buy("2026-01-05", 200),
  ];
  assert.deepEqual(investedCurve(rows), [
    { date: "2026-01-02", value: 1000 },
    { date: "2026-01-05", value: 1200 },
  ]);
});

/* ── Every day you traded ─────────────────────────────────────────────── */

test("a ledger with no trades has no calendar", () => {
  assert.deepEqual(activityCalendar([]), []);
  assert.deepEqual(
    activityCalendar([{ date: "2026-08-20", type: "DEPOSIT", symbol: null, amount: 100 }]),
    [],
  );
});

test("the calendar spans the window and bands on counts", () => {
  const cells = activityCalendar(
    [buy("2026-08-20"), buy("2026-08-20"), buy("2026-08-19")],
    2,
    "2026-08-20",
  );
  assert.equal(cells.length, 14);
  assert.equal(cells[cells.length - 1].date, "2026-08-20");
  assert.equal(cells[cells.length - 1].level, 2, "two trades is the second band");
  assert.equal(cells[cells.length - 2].level, 1, "one trade is the first");
  assert.equal(cells[0].level, 0, "a day with nothing is empty, not missing");
});

test("a busy day carries a count, never a direction", () => {
  const cells = activityCalendar(Array.from({ length: 9 }, () => buy("2026-08-20")), 1, "2026-08-20");
  const today = cells[cells.length - 1];
  assert.equal(today.level, 4);
  assert.match(today.note!, /9 trades/);
  assert.ok(!("dir" in today), "activity is not money and must not claim a direction");
});

/* ── Unrealised by position ───────────────────────────────────────────── */

test("a name with no P&L on file is dropped, never drawn at zero", () => {
  const cols = positionColumns([
    hold({ symbol: "A", pnl: 120 }),
    hold({ symbol: "B" }),
    hold({ symbol: "C", pnl: -80 }),
  ]);
  assert.deepEqual(cols.map((c) => c.date), ["A", "C"]);
});

test("columns are ordered by magnitude, both directions", () => {
  const cols = positionColumns([
    hold({ symbol: "SMALL", pnl: 10 }),
    hold({ symbol: "BIGLOSS", pnl: -900 }),
    hold({ symbol: "BIGWIN", pnl: 400 }),
  ]);
  assert.deepEqual(cols.map((c) => c.date), ["BIGLOSS", "BIGWIN", "SMALL"]);
});

/* ── Return on cost ───────────────────────────────────────────────────── */

test("return on cost is value over cost, and null without a cost basis", () => {
  assert.equal(returnOnCost([]), null);
  assert.equal(returnOnCost([hold({ symbol: "A", value: 100 })]), null);
  const r = returnOnCost([hold({ symbol: "A", cost: 1000, value: 1100 })]);
  assert.ok(r != null && Math.abs(r - 0.1) < 1e-9);
});

test("it refuses when most of the book is unpriced", () => {
  /*
   * A figure computed on a quarter of an account looks exactly like one
   * computed on all of it, and there is nothing on the surface to tell them
   * apart — so it is withheld rather than qualified.
   */
  const thin = returnOnCost([
    hold({ symbol: "PRICED", cost: 100, value: 110 }),
    hold({ symbol: "REST", value: 900 }),
  ]);
  assert.equal(thin, null);
});

test("it is a fraction and carries no time in it", () => {
  /* Same cost, same value, wildly different holding periods — same figure. */
  const r = returnOnCost([
    hold({ symbol: "OLD", cost: 500, value: 750 }),
    hold({ symbol: "NEW", cost: 500, value: 750 }),
  ]);
  assert.ok(r != null && Math.abs(r - 0.5) < 1e-9);
});
