import assert from "node:assert/strict";
import { test } from "node:test";
import { firstReads } from "./first";
import type { FirstInput } from "./first";
import type { HoldingRow } from "@/lib/db/queries";
import type { TxnLite } from "@/lib/score/types";

const hold = (symbol: string, value: number): HoldingRow => ({
  symbol,
  description: symbol,
  units: 1,
  price: value,
  cost: value,
  value,
  pnl: 0,
  pnlPct: 0,
  pnlSource: "cost",
});

const buy = (date: string, symbol = "AAA"): TxnLite => ({
  date,
  type: "BUY",
  symbol,
  units: 1,
  price: 10,
  amount: -10,
});

const base = (over: Partial<FirstInput> = {}): FirstInput => ({
  holdings: [],
  transactions: [],
  sectors: [],
  sectorCover: null,
  cashShare: null,
  today: "2026-08-21",
  ...over,
});

const keys = (input: FirstInput) => firstReads(input).map((r) => r.key);

test("an empty account reads nothing rather than something", () => {
  assert.deepEqual(firstReads(base()), []);
});

test("two positions are concentrated by definition, so it is not reported", () => {
  const two = base({ holdings: [hold("A", 60), hold("B", 40)] });
  assert.ok(!keys(two).includes("concentration"));
  const three = base({ holdings: [hold("A", 60), hold("B", 30), hold("C", 10)] });
  assert.ok(keys(three).includes("concentration"));
});

test("concentration is the top two over the whole book", () => {
  const read = firstReads(
    base({ holdings: [hold("A", 50), hold("B", 30), hold("C", 20)] }),
  ).find((r) => r.key === "concentration");
  assert.equal(read?.figure, "80%");
  assert.match(read!.headline, /A and B/);
});

test("no market key means no sector read — never an inferred one", () => {
  const read = base({ holdings: [hold("A", 50), hold("B", 30), hold("C", 20)] });
  assert.ok(!keys(read).includes("sector"));
});

test("a sector read waits until half the book is classified", () => {
  const holdings = [hold("A", 50), hold("B", 30), hold("C", 20)];
  const thin = base({
    holdings,
    sectors: [{ name: "Energy", share: 0.2 }],
    sectorCover: 0.2,
  });
  assert.ok(!keys(thin).includes("sector"), "20% classified is not a tilt");
  const full = base({
    holdings,
    sectors: [
      { name: "Technology", share: 0.8 },
      { name: "Energy", share: 0.2 },
    ],
    sectorCover: 1,
  });
  assert.ok(keys(full).includes("sector"));
});

test("cash is absent when the brokerage will not report a balance", () => {
  assert.ok(!keys(base({ cashShare: null })).includes("cash"));
  assert.ok(!keys(base({ cashShare: 0.005 })).includes("cash"), "a rounding error is not a position");
  assert.ok(keys(base({ cashShare: 0.31 })).includes("cash"));
});

test("a big cash pile reads as money not working, a small one as neutral", () => {
  const big = firstReads(base({ cashShare: 0.4 })).find((r) => r.key === "cash");
  const small = firstReads(base({ cashShare: 0.05 })).find((r) => r.key === "cash");
  assert.equal(big?.tone, "loss");
  assert.equal(small?.tone, "signal");
});

test("the longest hold only counts a name still held", () => {
  const input = base({
    holdings: [hold("KEPT", 100)],
    transactions: [buy("2024-01-02", "KEPT"), buy("2020-01-02", "SOLD")],
  });
  const read = firstReads(input).find((r) => r.key === "longest-hold");
  assert.ok(read, "expected the open position, not the closed one");
  assert.match(read.headline, /KEPT/);
});

test("cadence needs six buys, and states a count rather than a verdict", () => {
  const five = Array.from({ length: 5 }, (_, i) => buy(`2026-01-0${i + 1}`));
  assert.ok(!keys(base({ transactions: five })).includes("cadence"));

  const monthly = Array.from({ length: 6 }, (_, i) =>
    buy(`2026-0${i + 1}-05`),
  );
  const read = firstReads(base({ transactions: monthly })).find((r) => r.key === "cadence");
  assert.ok(read);
  assert.match(read.headline, /every 3[01] days/);
  assert.doesNotMatch(read.body, /should|consider|try/i);
});

test("a flat week is not an entry-day tilt", () => {
  /* Ten buys spread evenly across weekdays: no day carries a third. */
  const spread = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05",
                  "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"];
  assert.ok(!keys(base({ transactions: spread.map((d) => buy(d)) })).includes("entry-day"));
});

test("a real entry-day tilt is named, with the count behind it", () => {
  /* Ten buys, eight of them on Mondays. */
  const mondays = ["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22",
                   "2026-06-29", "2026-07-06", "2026-07-13", "2026-07-20"];
  const other = ["2026-06-03", "2026-06-10"];
  const read = firstReads(
    base({ transactions: [...mondays, ...other].map((d) => buy(d)) }),
  ).find((r) => r.key === "entry-day");
  assert.ok(read);
  assert.match(read.headline, /Monday/);
  assert.match(read.body, /8 of 10/);
});

test("no read recommends, predicts or compares the reader to anybody", () => {
  const reads = firstReads(
    base({
      holdings: [hold("A", 50), hold("B", 30), hold("C", 20)],
      transactions: Array.from({ length: 12 }, (_, i) => buy(`2026-0${(i % 9) + 1}-05`)),
      cashShare: 0.1,
      sectors: [{ name: "Technology", share: 0.8 }, { name: "Energy", share: 0.2 }],
      sectorCover: 1,
    }),
  );
  assert.ok(reads.length >= 4, `expected several reads, got ${reads.length}`);
  for (const read of reads) {
    const text = `${read.headline} ${read.body}`;
    assert.doesNotMatch(text, /should|consider|recommend|will likely|other investors|peers/i, read.key);
    assert.doesNotMatch(text, /!/, read.key);
  }
});
