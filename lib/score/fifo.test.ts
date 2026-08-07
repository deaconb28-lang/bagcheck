import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRoundTrips } from "./fifo";
import type { TxnLite } from "./types";

function txn(partial: Partial<TxnLite>): TxnLite {
  return {
    date: null,
    type: null,
    symbol: null,
    units: null,
    price: null,
    amount: null,
    ...partial,
  };
}

test("simple buy then sell produces one round trip", () => {
  const trips = buildRoundTrips([
    txn({ date: "2026-01-01", type: "BUY", symbol: "AAPL", units: 10, price: 10 }),
    txn({ date: "2026-02-10", type: "SELL", symbol: "AAPL", units: 10, price: 15 }),
  ]);
  assert.equal(trips.length, 1);
  assert.equal(trips[0].pnl, 50);
  assert.equal(trips[0].holdDays, 40);
  assert.equal(trips[0].notional, 100);
});

test("sells consume lots FIFO across multiple buys", () => {
  const trips = buildRoundTrips([
    txn({ date: "2026-01-01", type: "BUY", symbol: "TSLA", units: 10, price: 100 }),
    txn({ date: "2026-01-15", type: "BUY", symbol: "TSLA", units: 5, price: 120 }),
    txn({ date: "2026-02-01", type: "SELL", symbol: "TSLA", units: 12, price: 130 }),
  ]);
  assert.equal(trips.length, 2);
  // First trip closes the whole first lot.
  assert.equal(trips[0].pnl, (130 - 100) * 10);
  // Second consumes 2 units of the second lot.
  assert.equal(trips[1].pnl, (130 - 120) * 2);
});

test("sells without a matching lot are ignored, not guessed", () => {
  const trips = buildRoundTrips([
    txn({ date: "2026-01-05", type: "SELL", symbol: "NVDA", units: 3, price: 500 }),
  ]);
  assert.equal(trips.length, 0);
});

test("symbols are matched independently", () => {
  const trips = buildRoundTrips([
    txn({ date: "2026-01-01", type: "BUY", symbol: "A", units: 1, price: 10 }),
    txn({ date: "2026-01-01", type: "BUY", symbol: "B", units: 1, price: 20 }),
    txn({ date: "2026-01-02", type: "SELL", symbol: "B", units: 1, price: 25 }),
  ]);
  assert.equal(trips.length, 1);
  assert.equal(trips[0].symbol, "B");
  assert.equal(trips[0].pnl, 5);
});

test("transactions missing price, units, or symbol are skipped", () => {
  const trips = buildRoundTrips([
    txn({ date: "2026-01-01", type: "BUY", symbol: "A", units: 5, price: null }),
    txn({ date: "2026-01-02", type: "SELL", symbol: "A", units: 5, price: 12 }),
  ]);
  assert.equal(trips.length, 0);
});
