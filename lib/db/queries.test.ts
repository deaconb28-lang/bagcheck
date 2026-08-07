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
