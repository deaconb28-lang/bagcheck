import assert from "node:assert/strict";
import test from "node:test";
import type { RoundTrip, TxnLite } from "@/lib/score";
import type { EquityPoint } from "./segments";
import { drawdownWindows, eventSegments, segmentReading } from "./segments";

const day = (i: number): string => {
  const d = new Date(Date.UTC(2026, 0, 1 + i));
  return d.toISOString().slice(0, 10);
};

/** A 120-day series: flat, a 20% drawdown bottoming around day 60, recovery. */
const series = (): EquityPoint[] =>
  Array.from({ length: 120 }, (_, i) => {
    let value = 100_000;
    if (i >= 40 && i < 60) value = 100_000 - (i - 40) * 1000; // slide to −20%
    else if (i >= 60 && i < 90) value = 80_000 + (i - 60) * 800; // climb back
    else if (i >= 90) value = 104_000; // new highs
    return { date: day(i), value };
  });

test("a real drawdown becomes a window, named for its trough month", () => {
  const windows = drawdownWindows(series());
  assert.equal(windows.length, 1);
  const w = windows[0];
  assert.equal(w.start, day(40));
  assert.equal(w.troughDate, day(60));
  assert.ok(Math.abs(w.drawdownPct - 20) < 0.5, String(w.drawdownPct));
  assert.equal(w.label, "March 2026"); // day 60 = 2026-03-02
  assert.equal(w.recovered, true);
});

test("weather does not become an event, and short series stay silent", () => {
  const calm = Array.from({ length: 120 }, (_, i) => ({
    date: day(i),
    value: 100_000 - (i % 7) * 500, // 3% wobble
  }));
  assert.equal(drawdownWindows(calm).length, 0);
  assert.equal(drawdownWindows(series().slice(0, 30)).length, 0);
});

test("an unrecovered drawdown stays an open window", () => {
  const falling = series().slice(0, 75); // recovery incomplete
  const windows = drawdownWindows(falling);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].recovered, false);
  assert.equal(windows[0].end, day(74));
});

test("holding through with no loss sells reads as discipline", () => {
  const [w] = drawdownWindows(series());
  const trips: RoundTrip[] = Array.from({ length: 3 }, (_, i) => ({
    symbol: `S${i}`,
    openDate: day(10),
    closeDate: day(110),
    holdDays: 100,
    pnl: 500,
    notional: 10_000,
  }));
  const f = segmentReading(w, trips, []);
  assert.ok(f, "expected a reading");
  assert.match(f.sentence, /you held 3 positions and sold nothing at a loss/);
  assert.match(f.sentence, /March 2026 drawdown — 20% peak to trough/);
  assert.equal(f.tone, "moss");
});

test("selling into the hole is named with the realised figure", () => {
  const [w] = drawdownWindows(series());
  const trips: RoundTrip[] = Array.from({ length: 4 }, (_, i) => ({
    symbol: `S${i}`,
    openDate: day(10),
    closeDate: day(50), // inside the window
    holdDays: 40,
    pnl: -800,
    notional: 10_000,
  }));
  const f = segmentReading(w, trips, []);
  assert.ok(f);
  assert.match(f.sentence, /closed 4 positions at a loss/);
  assert.match(f.sentence, /−\$3,200 realised/);
  assert.equal(f.tone, "clay");
});

test("a window the reader slept through is not their event", () => {
  const [w] = drawdownWindows(series());
  assert.equal(segmentReading(w, [], []), null);
});

test("eventSegments caps at the two deepest windows the reader was in", () => {
  const trips: RoundTrip[] = [
    {
      symbol: "HOLD",
      openDate: day(0),
      closeDate: day(119),
      holdDays: 119,
      pnl: 1000,
      notional: 50_000,
    },
  ];
  const txns: TxnLite[] = Array.from({ length: 4 }, (_, i) => ({
    date: day(45 + i),
    type: "BUY",
    symbol: `B${i}`,
    units: 1,
    price: 10,
    amount: -1000,
  }));
  const found = eventSegments(series(), trips, txns);
  assert.equal(found.length, 1);
  assert.match(found[0].evidence, /4 adds · 1 held through · 0 loss sells/);
});
