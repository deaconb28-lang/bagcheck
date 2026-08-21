import assert from "node:assert/strict";
import { test } from "node:test";
import { heatStrength, heatTiles } from "./heatmap";
import type { HeatItem } from "./heatmap";

const item = (symbol: string, value: number, pnlPct: number | null = 0): HeatItem => ({
  symbol,
  value,
  pnlPct,
});

test("under two priced holdings there is no map", () => {
  assert.deepEqual(heatTiles([]), []);
  assert.deepEqual(heatTiles([item("A", 100)]), []);
});

test("a name with no market value is dropped, never drawn at zero", () => {
  const tiles = heatTiles([item("A", 100), item("B", 50), { ...item("C", 0) }]);
  assert.deepEqual(tiles.map((t) => t.symbol).sort(), ["A", "B"]);
});

test("the tiles fill the box exactly and never overlap", () => {
  const tiles = heatTiles([
    item("A", 500),
    item("B", 250),
    item("C", 125),
    item("D", 75),
    item("E", 50),
  ]);
  const area = tiles.reduce((sum, t) => sum + t.w * t.h, 0);
  assert.ok(Math.abs(area - 10_000) < 1, `covered ${area} of 10000`);
  for (const t of tiles) {
    assert.ok(t.x >= -0.001 && t.y >= -0.001, `${t.symbol} starts off the box`);
    assert.ok(t.x + t.w <= 100.001, `${t.symbol} runs off the right`);
    assert.ok(t.y + t.h <= 100.001, `${t.symbol} runs off the bottom`);
  }
});

test("area is the share of the book, so the biggest name is the biggest tile", () => {
  const tiles = heatTiles([item("BIG", 800), item("MID", 150), item("SMALL", 50)]);
  const big = tiles.find((t) => t.symbol === "BIG")!;
  const small = tiles.find((t) => t.symbol === "SMALL")!;
  assert.ok(Math.abs(big.weight - 0.8) < 1e-9);
  assert.ok(big.w * big.h > small.w * small.h * 10);
});

test("tiles come back largest first, so the order is the book's order", () => {
  const tiles = heatTiles([item("C", 100), item("A", 400), item("B", 200)]);
  assert.deepEqual(tiles.map((t) => t.symbol), ["A", "B", "C"]);
});

test("squarify keeps tiles from becoming slivers", () => {
  /* Ten equal names should come back roughly square, never as ten hairlines. */
  const tiles = heatTiles(Array.from({ length: 10 }, (_, i) => item(`S${i}`, 100)));
  for (const t of tiles) {
    const ratio = Math.max(t.w / t.h, t.h / t.w);
    assert.ok(ratio < 4, `${t.symbol} is ${ratio.toFixed(1)}:1`);
  }
});

test("light is capped, so a moonshot and a good year are still different colours", () => {
  assert.equal(heatStrength(0), 0);
  assert.ok(heatStrength(10) > 0 && heatStrength(10) < 1);
  assert.equal(heatStrength(25), 1);
  assert.equal(heatStrength(400), 1);
  assert.equal(heatStrength(-25), 1, "direction is the caller's, magnitude is here");
});

test("a name with no cost basis is unlit rather than green", () => {
  assert.equal(heatStrength(null), 0);
});
