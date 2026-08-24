import assert from "node:assert/strict";
import test from "node:test";
import { UNGROUPED, axisFor, groupByTheme, place, ramp, type Position } from "./flashpoint";

const p = (
  symbol: string,
  sector: string | null,
  value: number,
  pnlPct: number | null,
): Position => ({
  symbol,
  name: symbol,
  sector,
  value,
  pnl: null,
  pnlPct,
  basis: 10,
  price: 12,
});

const BOOK: Position[] = [
  p("GEV", "Power", 1021, 49.75),
  p("CEG", "Power", 362, 14.5),
  p("CCJ", "Nuclear", 645, -8.68),
  p("SMR", "Nuclear", 189, -4.39),
  p("ALOY", "Critical materials", 943, 95.74),
  p("UUUU", "Critical materials", 923, -6.88),
  p("RXRX", null, 82, 0),
];

test("groups are ordered by weight and names inside them by return", () => {
  const groups = groupByTheme(BOOK);
  assert.deepEqual(
    groups.map((g) => g.label),
    ["CRITICAL MATERIALS", "POWER", "NUCLEAR", UNGROUPED],
  );
  assert.deepEqual(
    groups[0].rows.map((r) => r.symbol),
    ["ALOY", "UUUU"],
  );
});

test("a name the provider could not classify gets its own group, always last", () => {
  /* Folding it into the largest theme would be a claim the data does not
     support; dropping it would stop the weights summing to the book. */
  const groups = groupByTheme(BOOK);
  assert.equal(groups[groups.length - 1].label, UNGROUPED);
  assert.deepEqual(groups[groups.length - 1].rows.map((r) => r.symbol), ["RXRX"]);
});

test("weights sum to the whole book", () => {
  const groups = groupByTheme(BOOK);
  const total = groups.reduce((sum, g) => sum + g.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `summed to ${total}`);
});

test("a holding with no cost basis is not drawn, rather than drawn at zero", () => {
  const groups = groupByTheme([...BOOK, p("MYST", "Power", 500, null)]);
  const symbols = groups.flatMap((g) => g.rows.map((r) => r.symbol));
  assert.ok(!symbols.includes("MYST"));
});

test("the axis always straddles zero and carries it as a tick", () => {
  const axis = axisFor([0.4975, 0.145, -0.0868, 0.9574]);
  assert.ok(axis.min <= 0 && axis.max >= 0);
  assert.ok(axis.ticks.some((t) => Math.abs(t) < 1e-9));
  assert.ok(axis.zero > 0 && axis.zero < 1);
});

test("the axis is not mirrored — a long-only book would spend half the plot empty", () => {
  const axis = axisFor([0.5, 0.95, -0.05]);
  assert.ok(Math.abs(axis.min) < axis.max, `${axis.min} vs ${axis.max}`);
  assert.ok(axis.zero < 0.3, `zero sat at ${axis.zero}`);
});

test("no bar reaches the plot edge", () => {
  const rets = [0.4975, 0.9574, -0.3172];
  const axis = axisFor(rets);
  for (const v of rets) {
    const at = place(v, axis);
    assert.ok(at > 0.001 && at < 0.999, `${v} landed at ${at}`);
  }
});

test("a book that has not moved still gets a drawable axis", () => {
  const axis = axisFor([0, 0, 0]);
  assert.ok(axis.max > axis.min);
  assert.ok(axis.ticks.length >= 2);
});

test("gains and losses are ranked separately", () => {
  /* They are different questions: the worst loser should read as the deepest
     red whatever the best winner did. */
  const step = ramp([0.95, 0.5, 0.15, -0.32, -0.09]);
  assert.equal(step(0.95), 4);
  assert.equal(step(-0.32), 4);
  assert.equal(step(-0.09), 1);
  assert.equal(step(0), 1);
});

test("the ramp never runs backwards within a direction", () => {
  const step = ramp([0.1, 0.3, 0.6, 0.9]);
  let last = 0;
  for (const v of [0.1, 0.3, 0.6, 0.9]) {
    assert.ok(step(v) >= last);
    last = step(v);
  }
});
