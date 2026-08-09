import assert from "node:assert/strict";
import test from "node:test";
import type { RoundTrip, TxnLite } from "@/lib/score";
import { sizingAfterLoss, tradeDrift } from "./tilt";

const trip = (closeDate: string, pnl: number): RoundTrip => ({
  symbol: "AAA",
  openDate: "2026-01-01",
  closeDate,
  holdDays: 5,
  pnl,
  notional: 1000,
});

const buy = (date: string, amount: number): TxnLite => ({
  date,
  type: "BUY",
  symbol: "AAA",
  units: 1,
  price: 10,
  amount: -Math.abs(amount),
});

/** Alternating red day → next-day buy, across distinct dates. */
const day = (i: number) => `2026-03-${String(i + 1).padStart(2, "0")}`;

test("sizing up after red days is named, across a weekend gap too", () => {
  const trips: RoundTrip[] = [];
  const txns: TxnLite[] = [];
  // Eight red closes on even days; the buy on the *next active day* doubles.
  for (let i = 0; i < 16; i += 2) {
    trips.push(trip(day(i), -50));
    txns.push(buy(day(i), 100)); // usual size, on the red day itself
    txns.push(buy(day(i + 1), 200)); // doubled, the session after
  }
  const f = sizingAfterLoss(trips, txns);
  assert.ok(f, "expected a finding");
  assert.match(f.sentence, /2\.0× your usual size/);
  assert.equal(f.tone, "signal");
});

test("sizing down after red days reads as discipline", () => {
  const trips: RoundTrip[] = [];
  const txns: TxnLite[] = [];
  for (let i = 0; i < 16; i += 2) {
    trips.push(trip(day(i), -50));
    txns.push(buy(day(i), 200));
    txns.push(buy(day(i + 1), 100));
  }
  const f = sizingAfterLoss(trips, txns);
  assert.ok(f);
  assert.match(f.sentence, /size down after a red day/);
  assert.equal(f.tone, "moss");
});

test("sizing stays silent when nothing changes after a loss", () => {
  const trips: RoundTrip[] = [];
  const txns: TxnLite[] = [];
  for (let i = 0; i < 16; i += 2) {
    trips.push(trip(day(i), -50));
    txns.push(buy(day(i), 100));
    txns.push(buy(day(i + 1), 105));
  }
  assert.equal(sizingAfterLoss(trips, txns), null);
});

test("cadence drift needs a real baseline and a real burst", () => {
  const txns: TxnLite[] = [];
  // Twelve quiet weeks: two trades a week, then sixteen in the final week.
  for (let w = 0; w < 12; w += 1) {
    txns.push(buy(`2026-0${1 + Math.floor(w / 5)}-${String((w % 5) * 6 + 1).padStart(2, "0")}`, 100));
    txns.push(buy(`2026-0${1 + Math.floor(w / 5)}-${String((w % 5) * 6 + 2).padStart(2, "0")}`, 100));
  }
  for (let i = 0; i < 16; i += 1) txns.push(buy("2026-04-01", 100));

  const f = tradeDrift(txns, "2026-04-01");
  assert.ok(f, "expected a finding");
  assert.match(f.sentence, /16 times this week/);
  assert.match(f.sentence, /8\.0× your twelve-week pace/);

  // The same week without the history behind it says nothing.
  assert.equal(tradeDrift(txns.slice(-16), "2026-04-01"), null);
});

test("a normal week is not drift", () => {
  const txns: TxnLite[] = [];
  for (let m = 1; m <= 3; m += 1)
    for (let d = 1; d <= 28; d += 3)
      txns.push(buy(`2026-0${m}-${String(d).padStart(2, "0")}`, 100));
  assert.equal(tradeDrift(txns, "2026-03-28"), null);
});
