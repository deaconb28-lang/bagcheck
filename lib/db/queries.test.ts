import assert from "node:assert/strict";
import { test } from "node:test";
import type { Position } from "snaptrade-typescript-sdk";
import { holdingsFrom } from "./queries";
import type { PositionSnapshotDoc } from "./types";

function position(
  symbol: string,
  units: number,
  price: number,
  avg: number | null,
  description?: string,
): Position {
  return {
    symbol: {
      description,
      symbol: { symbol },
    },
    units,
    price,
    average_purchase_price: avg,
  } as unknown as Position;
}

function snapshot(
  accountId: string,
  date: string,
  positions: Position[],
): PositionSnapshotDoc {
  return { userId: "u", accountId, date, takenAt: new Date(), positions };
}

test("maps SnapTrade position fields into holding rows", () => {
  const rows = holdingsFrom([
    snapshot("a1", "2026-08-07", [position("AAPL", 10, 200, 150, "Apple Inc.")]),
  ]);
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.equal(row.symbol, "AAPL");
  assert.equal(row.description, "Apple Inc.");
  assert.equal(row.units, 10);
  assert.equal(row.value, 2000);
  assert.equal(row.cost, 1500);
  assert.equal(row.pnl, 500);
  assert.ok(Math.abs(row.pnlPct! - 33.333) < 0.01);
});

test("uses only the latest snapshot per account", () => {
  const rows = holdingsFrom([
    snapshot("a1", "2026-08-01", [position("AAPL", 99, 100, 100)]),
    snapshot("a1", "2026-08-07", [position("AAPL", 10, 200, 150)]),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].units, 10, "stale snapshot must not be counted");
});

test("merges the same symbol held across two accounts", () => {
  const rows = holdingsFrom([
    snapshot("a1", "2026-08-07", [position("VTI", 5, 100, 80)]),
    snapshot("a2", "2026-08-07", [position("VTI", 3, 100, 90)]),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].units, 8);
  assert.equal(rows[0].value, 800);
  assert.equal(rows[0].cost, 5 * 80 + 3 * 90);
});

test("zero-unit positions are dropped and rows sort by value", () => {
  const rows = holdingsFrom([
    snapshot("a1", "2026-08-07", [
      position("SMALL", 1, 10, 5),
      position("CLOSED", 0, 500, 400),
      position("BIG", 10, 300, 200),
    ]),
  ]);
  assert.deepEqual(
    rows.map((r) => r.symbol),
    ["BIG", "SMALL"],
  );
});

test("missing price or cost basis yields null rather than a wrong number", () => {
  const rows = holdingsFrom([
    snapshot("a1", "2026-08-07", [
      { symbol: { symbol: { symbol: "X" } }, units: 4 } as unknown as Position,
    ]),
  ]);
  assert.equal(rows[0].value, null);
  assert.equal(rows[0].cost, null);
  assert.equal(rows[0].pnl, null);
  assert.equal(rows[0].pnlPct, null);
});

test("an empty snapshot list produces no rows", () => {
  assert.deepEqual(holdingsFrom([]), []);
});

/*
 * The brokerage's own unrealised P&L. SnapTrade returns `open_pnl` on every
 * position and it was stored and thrown away — so a broker that reports a P&L
 * but no average purchase price left the holding showing a dash, with a real
 * number already on file. It needs no derivation, so it is on screen as soon
 * as a sync has written one snapshot.
 */

const brokerPosition = (over: Record<string, unknown> = {}) => ({
  symbol: { symbol: { symbol: "NVDA" } },
  units: 10,
  price: 100,
  ...over,
});

test("cost basis is preferred when the broker gives one", () => {
  const [row] = holdingsFrom([
    {
      userId: "u",
      accountId: "a",
      date: "2026-08-17",
      takenAt: new Date(),
      positions: [brokerPosition({ average_purchase_price: 80, open_pnl: 999 })],
    },
  ] as never);
  assert.equal(row.pnl, 200);
  assert.equal(row.pnlSource, "cost");
});

test("the broker's own figure fills in when there is no cost basis", () => {
  const [row] = holdingsFrom([
    {
      userId: "u",
      accountId: "a",
      date: "2026-08-17",
      takenAt: new Date(),
      positions: [brokerPosition({ average_purchase_price: null, open_pnl: 150 })],
    },
  ] as never);
  assert.equal(row.pnl, 150);
  assert.equal(row.pnlSource, "broker");
  /* Value less the gain is what it cost, so a percentage is still honest. */
  assert.equal(Math.round(row.pnlPct ?? 0), 18);
});

test("neither available states no P&L rather than a zero", () => {
  const [row] = holdingsFrom([
    {
      userId: "u",
      accountId: "a",
      date: "2026-08-17",
      takenAt: new Date(),
      positions: [brokerPosition({ average_purchase_price: null, open_pnl: null })],
    },
  ] as never);
  assert.equal(row.pnl, null);
  assert.equal(row.pnlPct, null);
  assert.equal(row.pnlSource, null);
});
