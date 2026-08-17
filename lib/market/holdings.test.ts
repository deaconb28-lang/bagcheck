import assert from "node:assert/strict";
import test from "node:test";
import { nameRows, repriceRows } from "./holdings";
import type { HoldingRow } from "@/lib/db";
import type { ResolvedMark } from "./marks";

const row = (over: Partial<HoldingRow> = {}): HoldingRow => ({
  symbol: "NVDA",
  description: null,
  units: 10,
  price: 100,
  cost: 800,
  value: 1000,
  pnl: 200,
  pnlSource: "cost",
  pnlPct: 25,
  ...over,
});

const mark = (over: Partial<ResolvedMark> = {}): ResolvedMark => ({
  symbol: "NVDA",
  price: 110,
  source: "market",
  stale: false,
  ...over,
});

test("a refreshed mark reprices value and P&L, not units or cost", () => {
  const [out] = repriceRows([row()], [mark()]);
  assert.equal(out.price, 110);
  assert.equal(out.value, 1100);
  assert.equal(out.cost, 800, "cost basis is the brokerage's, not the market's");
  assert.equal(out.units, 10);
  assert.equal(out.pnl, 300);
  assert.ok(Math.abs(out.pnlPct! - 37.5) < 0.001);
});

test("a mark the brokerage still owns leaves the row untouched", () => {
  const before = row();
  for (const source of ["brokerage", "none"] as const) {
    const [out] = repriceRows([before], [mark({ source, price: 110 })]);
    assert.deepEqual(out, before, `${source} must not reprice`);
  }
});

test("a row with no matching mark is passed through", () => {
  const before = row({ symbol: "VTI" });
  assert.deepEqual(repriceRows([before], [mark()])[0], before);
});

test("a row with no cost basis gets a value but no P&L", () => {
  const [out] = repriceRows([row({ cost: null, pnl: null, pnlPct: null })], [mark()]);
  assert.equal(out.value, 1100);
  assert.equal(out.pnl, null);
  assert.equal(out.pnlPct, null);
});

test("names fill a gap and never overwrite the brokerage", () => {
  const names = new Map([
    ["NVDA", { name: "NVIDIA Corp" }],
    ["VTI", { name: "Vanguard Total Stock Market ETF" }],
  ]);
  const out = nameRows(
    [row(), row({ symbol: "VTI", description: "Vanguard Index Fund" })],
    names,
  );
  assert.equal(out[0].description, "NVIDIA Corp");
  assert.equal(out[1].description, "Vanguard Index Fund", "the brokerage's wording stands");
});

test("a symbol the name lookup missed stays without a description", () => {
  assert.equal(nameRows([row()], new Map())[0].description, null);
});
