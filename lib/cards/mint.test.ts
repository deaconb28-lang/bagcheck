import assert from "node:assert/strict";
import test from "node:test";
import type { RoundTrip, Streak } from "@/lib/score";
import { mintable, stripCells } from "./mint";

const trip = (o: Partial<RoundTrip> = {}): RoundTrip => ({
  symbol: "VTI", openDate: "2025-01-01", closeDate: "2026-01-01",
  holdDays: 40, pnl: 10, notional: 100, ...o,
});
const base = { score: null, trips: [], streaks: [] as Streak[], scoredDays: 0, panicSells: 0 };

test("nothing is minted from an empty history", () => {
  assert.deepEqual(mintable(base), []);
});

test("rarity comes from conduct, not from a tier", () => {
  const common = mintable({ ...base, score: { date: "2026-08-06", score: 71 } });
  assert.equal(common[0].rarity, null);

  const rare = mintable({ ...base, score: { date: "2026-08-06", score: 95 } });
  assert.equal(rare[0].rarity, "rare");
});

test("a year-long hold is rare and a six-week hold is not", () => {
  const short = mintable({ ...base, trips: [trip({ holdDays: 44 })] });
  assert.equal(short[0].kind, "hold");
  assert.equal(short[0].rarity, null);

  const long = mintable({ ...base, trips: [trip({ holdDays: 412 })] });
  assert.equal(long[0].rarity, "rare");
  // The card is about an instrument, so it carries one for its mark.
  assert.equal(long[0].symbol, "VTI");
  assert.match(long[0].tail, /412|days holding/);
});

test("a hold too short to be interesting mints nothing", () => {
  assert.deepEqual(mintable({ ...base, trips: [trip({ holdDays: 9 })] }), []);
});

test("cards that are not about an instrument carry no symbol", () => {
  const score = mintable({ ...base, score: { date: "2026-08-06", score: 80 } });
  assert.equal(score[0].symbol, null);
});

test("the zero-panic quarter needs a real quarter behind it", () => {
  assert.deepEqual(mintable({ ...base, scoredDays: 20, panicSells: 0 }), []);
  const earned = mintable({ ...base, scoredDays: 63, panicSells: 0 });
  assert.equal(earned[0].kind, "quarter");
  assert.equal(earned[0].rarity, "rare");
  assert.deepEqual(mintable({ ...base, scoredDays: 63, panicSells: 2 }), []);
});

test("the strip is deterministic per slug so image and page agree", () => {
  assert.deepEqual(stripCells("412-days"), stripCells("412-days"));
  assert.notDeepEqual(stripCells("412-days"), stripCells("q3-no-panic"));
  assert.equal(stripCells("x").length, 48);
});
