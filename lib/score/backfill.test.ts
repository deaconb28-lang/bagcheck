import assert from "node:assert/strict";
import test from "node:test";
import { dateRange, earliestDate, scoreRange } from "./backfill";
import type { TxnLite } from "./types";

const buy = (date: string, symbol = "AAA", units = 10, price = 100): TxnLite => ({
  date,
  type: "BUY",
  symbol,
  units,
  price,
  amount: units * price,
});

const sell = (date: string, symbol = "AAA", units = 10, price = 120): TxnLite => ({
  date,
  type: "SELL",
  symbol,
  units,
  price,
  amount: units * price,
});

test("dateRange is inclusive at both ends", () => {
  assert.deepEqual(dateRange("2026-01-01", "2026-01-04"), [
    "2026-01-01",
    "2026-01-02",
    "2026-01-03",
    "2026-01-04",
  ]);
});

test("dateRange of a single day is that day", () => {
  assert.deepEqual(dateRange("2026-03-09", "2026-03-09"), ["2026-03-09"]);
});

test("dateRange returns nothing when the range inverts", () => {
  assert.deepEqual(dateRange("2026-05-02", "2026-05-01"), []);
});

test("dateRange crosses a month and a year boundary", () => {
  assert.deepEqual(dateRange("2025-12-30", "2026-01-02"), [
    "2025-12-30",
    "2025-12-31",
    "2026-01-01",
    "2026-01-02",
  ]);
});

test("earliestDate finds the minimum and ignores undated rows", () => {
  const txns = [buy("2026-04-02"), { ...buy("2026-01-09"), date: null }, buy("2026-02-11")];
  assert.equal(earliestDate(txns as TxnLite[]), "2026-02-11");
});

test("earliestDate is null when nothing carries a date", () => {
  assert.equal(earliestDate([{ ...buy("x"), date: null }] as TxnLite[]), null);
});

test("scoreRange returns one score per day, in order", () => {
  const scores = scoreRange({
    transactions: [buy("2026-01-01"), sell("2026-01-05")],
    baseline: "swing",
    from: "2026-01-01",
    to: "2026-01-07",
  });
  assert.equal(scores.length, 7);
  assert.deepEqual(
    scores.map((s) => s.date),
    dateRange("2026-01-01", "2026-01-07"),
  );
});

test("every score is in range and carries its four components", () => {
  const scores = scoreRange({
    transactions: [buy("2026-01-01"), sell("2026-02-01"), buy("2026-02-03")],
    baseline: "swing",
    from: "2026-01-01",
    to: "2026-02-10",
  });
  for (const s of scores) {
    assert.ok(s.score >= 0 && s.score <= 100, `${s.date} scored ${s.score}`);
    for (const key of ["adherence", "consistency", "patience", "exposure"] as const) {
      const v = s.components[key];
      assert.ok(v >= 0 && v <= 100, `${s.date} ${key} = ${v}`);
    }
  }
});

/*
 * The reason the ledger is sliced per day: `patience` and `adherence` filter
 * trips through `daysBetween(closeDate, asOf)`, which clamps a negative span
 * to zero — so without slicing, a trip that closes in the future reads as
 * closing today and changes a score for a day it had not happened on.
 */
test("a day's score ignores transactions that had not happened yet", () => {
  const past = [buy("2026-01-02")];
  const future = [
    ...past,
    sell("2026-06-01"),
    buy("2026-06-02", "BBB"),
    sell("2026-06-03", "BBB"),
  ];

  const withoutFuture = scoreRange({
    transactions: past,
    baseline: "swing",
    from: "2026-01-10",
    to: "2026-01-10",
  })[0];

  const withFuture = scoreRange({
    transactions: future,
    baseline: "swing",
    from: "2026-01-10",
    to: "2026-01-10",
  })[0];

  assert.deepEqual(withFuture.components, withoutFuture.components);
  assert.equal(withFuture.score, withoutFuture.score);
});

test("days already stored are skipped", () => {
  const scores = scoreRange({
    transactions: [buy("2026-01-01")],
    baseline: "swing",
    from: "2026-01-01",
    to: "2026-01-05",
    have: new Set(["2026-01-02", "2026-01-03"]),
  });
  assert.deepEqual(
    scores.map((s) => s.date),
    ["2026-01-01", "2026-01-04", "2026-01-05"],
  );
});

test("the last day is recomputed even when already stored", () => {
  const scores = scoreRange({
    transactions: [buy("2026-01-01")],
    baseline: "swing",
    from: "2026-01-01",
    to: "2026-01-03",
    have: new Set(["2026-01-01", "2026-01-02", "2026-01-03"]),
  });
  assert.deepEqual(
    scores.map((s) => s.date),
    ["2026-01-03"],
  );
});

test("an empty ledger still scores the range rather than throwing", () => {
  const scores = scoreRange({
    transactions: [],
    baseline: "long-term",
    from: "2026-01-01",
    to: "2026-01-03",
  });
  assert.equal(scores.length, 3);
});

test("undated transactions never reach the scorer", () => {
  const scores = scoreRange({
    transactions: [{ ...buy("2026-01-01"), date: null } as TxnLite, buy("2026-01-02")],
    baseline: "swing",
    from: "2026-01-01",
    to: "2026-01-02",
  });
  assert.equal(scores.length, 2);
});
