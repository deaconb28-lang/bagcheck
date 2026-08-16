import assert from "node:assert/strict";
import test from "node:test";
import {
  dailyPnlFrom,
  equityFrom,
  holdTimeFrom,
  hashLedger,
  ledgerHash,
  reconcile,
} from "./derived";
import type { TxnLite } from "@/lib/score";

const txn = (over: Partial<TxnLite> = {}): TxnLite => ({
  date: "2026-08-01",
  type: "BUY",
  symbol: "NVDA",
  units: 10,
  price: 100,
  amount: -1000,
  ...over,
});

test("a sale is proceeds, not a result — only the matched gain counts", () => {
  /*
   * The sell fetched $400 and the round trip it closed made $60. The old
   * arithmetic reported the $400, which is the size of the position rather
   * than anything the reader earned.
   */
  const out = dailyPnlFrom(
    [
      txn({ type: "BUY", amount: -1000 }),
      txn({ type: "SELL", amount: 400 }),
      txn({ type: "DIVIDEND", amount: 20 }),
      txn({ type: "CONTRIBUTION", amount: 5000 }),
    ],
    [{ symbol: "NVDA", openDate: "2026-07-01", closeDate: "2026-08-01", holdDays: 31, pnl: 60, notional: 340 }],
  );
  assert.deepEqual(out, [{ date: "2026-08-01", realised: 80 }]);
});

test("with no round trips a session holds only its dividends", () => {
  const out = dailyPnlFrom([txn({ type: "SELL", amount: 400 }), txn({ type: "DIVIDEND", amount: 20 })]);
  assert.deepEqual(out, [{ date: "2026-08-01", realised: 20 }]);
});

test("realised P&L is summed per session and sorted forward", () => {
  const trip = (closeDate: string, pnl: number) => ({
    symbol: "NVDA",
    openDate: "2026-07-01",
    closeDate,
    holdDays: 30,
    pnl,
    notional: 1000,
  });
  const out = dailyPnlFrom(
    [],
    [trip("2026-08-03", 100), trip("2026-08-01", -50), trip("2026-08-01", 30)],
  );
  assert.deepEqual(out, [
    { date: "2026-08-01", realised: -20 },
    { date: "2026-08-03", realised: 100 },
  ]);
});

test("equity is forward-filled between snapshots and says which days were filled", () => {
  const out = equityFrom(
    [
      { date: "2026-08-01", value: 1000 },
      { date: "2026-08-04", value: 1200 },
    ],
    "2026-08-05",
  );
  assert.deepEqual(
    out.map((p) => [p.date, p.value, p.interpolated]),
    [
      ["2026-08-01", 1000, false],
      ["2026-08-02", 1000, true],
      ["2026-08-03", 1000, true],
      ["2026-08-04", 1200, false],
      ["2026-08-05", 1200, true],
    ],
  );
});

test("snapshots on the same day across accounts are summed, not overwritten", () => {
  const out = equityFrom(
    [
      { date: "2026-08-01", value: 1000 },
      { date: "2026-08-01", value: 400 },
    ],
    "2026-08-01",
  );
  assert.deepEqual(out, [{ date: "2026-08-01", value: 1400, interpolated: false }]);
});

test("an empty ledger produces no curve rather than a flat line at zero", () => {
  assert.deepEqual(equityFrom([], "2026-08-05"), []);
});

test("hold time splits winners from losers and stays null without samples", () => {
  const trip = (pnl: number, holdDays: number) => ({
    symbol: "NVDA",
    openDate: "2026-01-01",
    closeDate: "2026-02-01",
    holdDays,
    pnl,
    notional: 1000,
  });
  const out = holdTimeFrom([trip(100, 40), trip(60, 42), trip(-20, 6)]);
  assert.equal(out.winners, 2);
  assert.equal(out.losers, 1);
  assert.equal(out.winnersMean, 41);
  assert.equal(out.losersMean, 6);
  assert.deepEqual(holdTimeFrom([]), {
    winnersMean: null,
    losersMean: null,
    winners: 0,
    losers: 0,
  });
});

test("a name held with no buy on file is a transfer-in and is excluded", () => {
  const excluded = reconcile([txn({ symbol: "NVDA", units: 10 })], new Map([["VTI", 40]]));
  assert.deepEqual(excluded, ["VTI"]);
});

test("units that reconcile are not excluded", () => {
  const excluded = reconcile(
    [txn({ type: "BUY", units: 10 }), txn({ type: "SELL", units: 4 })],
    new Map([["NVDA", 6]]),
  );
  assert.deepEqual(excluded, []);
});

test("a split-sized divergence is excluded rather than silently skewing statistics", () => {
  // Bought 10, hold 20 — a 2:1 split the activity feed never reported.
  const excluded = reconcile([txn({ type: "BUY", units: 10 })], new Map([["NVDA", 20]]));
  assert.deepEqual(excluded, ["NVDA"]);
});

test("a rounding-sized difference is tolerated", () => {
  const excluded = reconcile(
    [txn({ type: "BUY", units: 10 })],
    new Map([["NVDA", 10.00001]]),
  );
  assert.deepEqual(excluded, []);
});

test("the hash moves when the ledger does and holds when it does not", () => {
  const rows = [txn({ date: "2026-01-01" }), txn({ date: "2026-08-01" })];
  const base = ledgerHash(rows, ["2026-08-01"]);
  assert.equal(base, ledgerHash(rows, ["2026-08-01"]), "same ledger, same hash");
  assert.notEqual(base, ledgerHash([...rows, txn({ date: "2026-08-02" })], ["2026-08-01"]));
  assert.notEqual(base, ledgerHash(rows, ["2026-08-01", "2026-08-02"]));
});

/*
 * The staleness check compared `transactionCount` and nothing else, which is
 * exactly the case this asserts against: a sync that reads a new position
 * snapshot without reading a new transaction — every sync on an account that
 * is holding rather than trading — moved the equity curve and nothing noticed.
 */
test("a new snapshot alone moves the hash", () => {
  const rows = [txn({ date: "2026-01-01" }), txn({ date: "2026-08-01" })];
  assert.notEqual(
    ledgerHash(rows, ["2026-08-01"]),
    ledgerHash(rows, ["2026-08-01", "2026-08-14"]),
  );
});

/*
 * The probe reads the two ends off the database rather than the whole ledger.
 * If it disagreed with the in-memory version for the same ledger, every page
 * view would rebuild — so the two have to be the same function.
 */
test("the probe and the loaded ledger agree", () => {
  const rows = [
    txn({ date: "2026-01-01", symbol: "NVDA", amount: -100 }),
    txn({ date: "2026-04-01", symbol: "AAPL", amount: 40 }),
    txn({ date: "2026-08-01", symbol: "MSFT", amount: 250 }),
  ];
  const dates = ["2026-07-30", "2026-08-01"];
  assert.equal(
    ledgerHash(rows, dates),
    hashLedger({
      count: rows.length,
      oldest: rows[0],
      newest: rows[rows.length - 1],
      snapshotDates: dates.length,
      lastSnapshot: "2026-08-01",
    }),
  );
});

/* The probe runs before the rebuild, so it meets an empty ledger first. */
test("an empty ledger hashes without throwing", () => {
  assert.equal(typeof ledgerHash([], []), "string");
  assert.equal(ledgerHash([], []).length, 16);
});
