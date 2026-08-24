import assert from "node:assert/strict";
import { test } from "node:test";
import { heatGroups, heatStrength, heatTiles } from "./heatmap";
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

test("themes are squarified by their own total, then names inside each", () => {
  const groups = heatGroups([
    { symbol: "ALOY", value: 943, pnlPct: 95.7, sector: "Critical materials" },
    { symbol: "UUUU", value: 923, pnlPct: -6.9, sector: "Critical materials" },
    { symbol: "GEV", value: 1021, pnlPct: 49.8, sector: "Power" },
    { symbol: "CEG", value: 362, pnlPct: 14.5, sector: "Power" },
    { symbol: "CCJ", value: 645, pnlPct: -8.7, sector: "Nuclear" },
  ]);
  assert.deepEqual(groups.map((g) => g.label), ["CRITICAL MATERIALS", "POWER", "NUCLEAR"]);
  /* Every name is placed, and only inside its own theme's box. */
  for (const group of groups) {
    assert.ok(group.tiles.length > 0, `${group.label} drew nothing`);
    for (const tile of group.tiles) {
      assert.ok(tile.x >= group.box.x - 1e-6, `${tile.symbol} left its box`);
      assert.ok(tile.y >= group.box.y - 1e-6);
      assert.ok(tile.x + tile.w <= group.box.x + group.box.w + 1e-6);
      assert.ok(tile.y + tile.h <= group.box.y + group.box.h + 1e-6);
    }
  }
});

test("the theme boxes tile the map without overlapping", () => {
  const groups = heatGroups([
    { symbol: "A", value: 500, pnlPct: 1, sector: "One" },
    { symbol: "B", value: 300, pnlPct: 1, sector: "Two" },
    { symbol: "C", value: 200, pnlPct: 1, sector: "Three" },
  ]);
  const area = groups.reduce((sum, g) => sum + g.box.w * g.box.h, 0);
  assert.ok(Math.abs(area - 10_000) < 1, `covered ${area}`);
  assert.ok(Math.abs(groups[0].weight - 0.5) < 1e-9);
});

test("an unclassified name gets its own theme, always last", () => {
  const groups = heatGroups([
    { symbol: "A", value: 100, pnlPct: 1, sector: "One" },
    { symbol: "B", value: 900, pnlPct: 1, sector: null },
  ]);
  assert.equal(groups[groups.length - 1].label, "UNCLASSIFIED");
});

test("a grouped tile states its share of the book, not of its theme", () => {
  /* heatTiles divides by whatever total it is handed, which is right for the
     whole map and wrong for one group inside it: a name that is two fifths of
     Technology came back as 40% under a caption saying "share of the book". */
  const groups = heatGroups([
    { symbol: "MSFT", value: 400, pnlPct: 3.5, sector: "Technology" },
    { symbol: "AAPL", value: 300, pnlPct: -0.9, sector: "Technology" },
    { symbol: "SHOP", value: 300, pnlPct: -12.5, sector: "Technology" },
    { symbol: "TSLA", value: 1000, pnlPct: -16, sector: "Automobiles" },
  ]);
  const msft = groups.flatMap((g) => g.tiles).find((t) => t.symbol === "MSFT");
  assert.ok(msft);
  assert.ok(Math.abs(msft.weight - 0.2) < 1e-9, `stated ${msft.weight}`);
  const summed = groups.flatMap((g) => g.tiles).reduce((sum, t) => sum + t.weight, 0);
  assert.ok(Math.abs(summed - 1) < 1e-9, `weights summed to ${summed}`);
});
