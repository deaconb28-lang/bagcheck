import assert from "node:assert/strict";
import test from "node:test";
import type { RoundTrip, TxnLite } from "@/lib/score";
import { entryHour, exitSpeed, findings, reEntry, sessionSize, whatIsMissing } from "./correlations";

const trip = (o: Partial<RoundTrip> = {}): RoundTrip => ({
  symbol: "AAA",
  openDate: "2026-01-05",
  closeDate: "2026-01-20",
  holdDays: 15,
  pnl: 100,
  notional: 1000,
  ...o,
});

const buy = (date: string, symbol = "AAA"): TxnLite => ({
  date,
  type: "BUY",
  symbol,
  units: 1,
  price: 10,
  amount: -10,
});

test("a thin ledger produces no findings at all", () => {
  const trips = Array.from({ length: 4 }, () => trip());
  assert.equal(findings(trips, []).length, 0);
});

test("exit speed names the direction it actually found", () => {
  const winners = Array.from({ length: 10 }, () => trip({ pnl: 50, holdDays: 40 }));
  const losers = Array.from({ length: 10 }, () => trip({ pnl: -50, holdDays: 8 }));
  const f = exitSpeed([...winners, ...losers]);
  assert.ok(f, "expected a finding");
  assert.match(f.sentence, /hold winners/);
  assert.equal(f.tone, "moss");

  const flipped = exitSpeed([
    ...Array.from({ length: 10 }, () => trip({ pnl: 50, holdDays: 5 })),
    ...Array.from({ length: 10 }, () => trip({ pnl: -50, holdDays: 30 })),
  ]);
  assert.ok(flipped);
  assert.match(flipped.sentence, /sell winners/);
  assert.equal(flipped.tone, "clay");
});

test("exit speed stays silent when the gap is not meaningful", () => {
  const trips = [
    ...Array.from({ length: 10 }, () => trip({ pnl: 50, holdDays: 11 })),
    ...Array.from({ length: 10 }, () => trip({ pnl: -50, holdDays: 10 })),
  ];
  assert.equal(exitSpeed(trips), null);
});

test("exit speed stays silent on an all-intraday ledger", () => {
  // Both averages round to 0d; the ratio between them is arithmetically real
  // and meaningless, and printing it makes the evidence contradict the claim.
  const trips = [
    ...Array.from({ length: 10 }, () => trip({ pnl: 50, holdDays: 0.4 })),
    ...Array.from({ length: 10 }, () => trip({ pnl: -50, holdDays: 0.036 })),
  ];
  assert.equal(exitSpeed(trips), null);
});

test("short hold averages keep a decimal so evidence matches the sentence", () => {
  const trips = [
    ...Array.from({ length: 10 }, () => trip({ pnl: 50, holdDays: 6.2 })),
    ...Array.from({ length: 10 }, () => trip({ pnl: -50, holdDays: 1.1 })),
  ];
  const f = exitSpeed(trips);
  assert.ok(f);
  assert.match(f.evidence, /6\.2d avg/);
  assert.match(f.evidence, /1\.1d avg/);
  assert.doesNotMatch(f.evidence, /\b0d avg/);
});

test("entry hour stays silent without timestamps", () => {
  const trips = Array.from({ length: 20 }, (_, i) =>
    trip({ openDate: `2026-01-${String(i + 1).padStart(2, "0")}` }),
  );
  const txns = trips.map((t) => buy(t.openDate));
  assert.equal(entryHour(trips, txns), null);
});

test("entry hour reads the clock when the broker supplies one", () => {
  const trips: RoundTrip[] = [];
  const txns: TxnLite[] = [];
  for (let i = 0; i < 10; i += 1) {
    const d = `2026-02-${String(i + 1).padStart(2, "0")}`;
    // Late entries lose, early entries win.
    trips.push(trip({ symbol: "LATE", openDate: d, pnl: -80, notional: 1000 }));
    txns.push({ ...buy(`${d}T19:30:00Z`, "LATE") });
    trips.push(trip({ symbol: "EARLY", openDate: d, pnl: 90, notional: 1000 }));
    txns.push({ ...buy(`${d}T14:30:00Z`, "EARLY") });
  }
  const f = entryHour(trips, txns);
  assert.ok(f, "expected a finding");
  assert.match(f.sentence, /after 2pm/);
  assert.equal(f.tone, "clay");
});

test("session size compares busy days against quiet ones", () => {
  const trips: RoundTrip[] = [];
  const txns: TxnLite[] = [];
  for (let i = 0; i < 10; i += 1) {
    const busy = `2026-03-${String(i + 1).padStart(2, "0")}`;
    for (let k = 0; k < 6; k += 1) txns.push(buy(busy, `B${k}`));
    trips.push(trip({ openDate: busy, pnl: -40 }));

    const quiet = `2026-04-${String(i + 1).padStart(2, "0")}`;
    txns.push(buy(quiet, "Q"));
    trips.push(trip({ openDate: quiet, pnl: 60 }));
  }
  const f = sessionSize(trips, txns);
  assert.ok(f, "expected a finding");
  assert.match(f.sentence, /six or more trades/);
});

test("re-entry counts only losing exits followed within three days", () => {
  const trips: RoundTrip[] = [];
  for (let i = 0; i < 10; i += 1) {
    const day = 1 + i * 2;
    trips.push(
      trip({
        symbol: `S${i}`,
        openDate: "2026-05-01",
        closeDate: `2026-05-${String(day).padStart(2, "0")}`,
        pnl: -10,
      }),
    );
    // Same name, re-opened the next day.
    trips.push(
      trip({
        symbol: `S${i}`,
        openDate: `2026-05-${String(day + 1).padStart(2, "0")}`,
        closeDate: "2026-06-30",
        pnl: 5,
      }),
    );
  }
  const f = reEntry(trips);
  assert.ok(f, "expected a finding");
  assert.match(f.sentence, /within three days/);
});

test("the empty state names what is missing, never 'nothing here'", () => {
  assert.match(whatIsMissing([], []), /at least 8 closed positions/);
  const trips = Array.from({ length: 12 }, () => trip());
  assert.match(
    whatIsMissing(trips, trips.map((t) => buy(t.openDate))),
    /without a clock/,
  );
});
