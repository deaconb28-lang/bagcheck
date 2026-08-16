import assert from "node:assert/strict";
import test from "node:test";
import { fieldProvenance, isStale, provenanceLine, resolveMark, resolveMarks } from "./marks";
import type { Quote, StoredMark } from "./marks";

const TODAY = "2026-08-08";

const stored = (price: number | null, asOf: string | null): StoredMark => ({
  symbol: "NVDA",
  price,
  asOf,
});

const quote = (price: number): Quote => ({ symbol: "NVDA", price, previousClose: null });

test("a snapshot from today is current", () => {
  assert.equal(isStale(TODAY, TODAY), false);
  assert.equal(isStale("2026-08-08T21:00:00.000Z", TODAY), false);
});

test("yesterday's snapshot is stale, and never having synced is stale", () => {
  assert.equal(isStale("2026-08-07", TODAY), true);
  assert.equal(isStale(null, TODAY), true);
});

test("a stale mark is replaced by the quote and says so", () => {
  const m = resolveMark(stored(100, "2026-08-01"), quote(104), TODAY);
  assert.equal(m.price, 104);
  assert.equal(m.source, "market");
  assert.equal(m.stale, false);
});

test("a mark from today is left alone even when a quote is available", () => {
  const m = resolveMark(stored(100, TODAY), quote(104), TODAY);
  assert.equal(m.price, 100);
  assert.equal(m.source, "brokerage");
  assert.equal(m.stale, false);
});

test("a quote that disagrees by more than half is not a correction", () => {
  // A symbol that resolved to a different instrument would be wrong in a way
  // the user cannot see, so the brokerage's own number stands.
  const m = resolveMark(stored(100, "2026-08-01"), quote(20), TODAY);
  assert.equal(m.price, 100);
  assert.equal(m.source, "brokerage");
  assert.equal(m.stale, true);
});

test("a move right at the edge of plausible is still accepted", () => {
  assert.equal(resolveMark(stored(100, "2026-08-01"), quote(150), TODAY).source, "market");
  assert.equal(resolveMark(stored(100, "2026-08-01"), quote(151), TODAY).source, "brokerage");
});

test("a missing brokerage price is filled by any quote", () => {
  const m = resolveMark(stored(null, TODAY), quote(104), TODAY);
  assert.equal(m.price, 104);
  assert.equal(m.source, "market");
});

test("with no price and no quote the mark is empty rather than zero", () => {
  const m = resolveMark(stored(null, null), null, TODAY);
  assert.equal(m.price, null);
  assert.equal(m.source, "none");
  assert.equal(m.stale, true);
});

test("a zero or negative quote is ignored", () => {
  for (const bad of [0, -3]) {
    const m = resolveMark(stored(100, "2026-08-01"), quote(bad), TODAY);
    assert.equal(m.price, 100, `${bad} should not become a price`);
  }
});

test("resolving many marks keeps order and matches quotes by symbol", () => {
  const marks = resolveMarks(
    [
      { symbol: "NVDA", price: 100, asOf: "2026-08-01" },
      { symbol: "VTI", price: 200, asOf: TODAY },
    ],
    new Map([["NVDA", { symbol: "NVDA", price: 104, previousClose: null }]]),
    TODAY,
  );
  assert.deepEqual(
    marks.map((m) => [m.symbol, m.price, m.source]),
    [
      ["NVDA", 104, "market"],
      ["VTI", 200, "brokerage"],
    ],
  );
});

test("provenance names the source and counts, singular and plural", () => {
  const refreshed = { symbol: "NVDA", price: 104, source: "market" as const, stale: false };
  const fresh = { symbol: "VTI", price: 200, source: "brokerage" as const, stale: false };
  const old = { symbol: "F", price: 11, source: "brokerage" as const, stale: true };

  assert.equal(
    provenanceLine([refreshed, fresh], "2026-08-01"),
    "Brokerage synced 2026-08-01 · 1 mark refreshed from market data",
  );
  assert.equal(
    provenanceLine([refreshed, { ...refreshed, symbol: "F" }], "2026-08-01"),
    "Brokerage synced 2026-08-01 · 2 marks refreshed from market data",
  );
  assert.equal(
    provenanceLine([old, fresh], "2026-08-01"),
    "Brokerage synced 2026-08-01 · 1 mark is from that sync",
  );
  assert.equal(
    provenanceLine([fresh], "2026-08-01"),
    "Brokerage synced 2026-08-01 · every mark is from that sync",
  );
  assert.equal(provenanceLine([fresh], null), "Never synced · every mark is from that sync");
});

test("provenance never suggests doing anything", () => {
  const lines = [
    provenanceLine([{ symbol: "NVDA", price: 1, source: "market", stale: false }], "2026-08-01"),
    provenanceLine([{ symbol: "NVDA", price: 1, source: "brokerage", stale: true }], null),
  ];
  for (const line of lines) {
    assert.ok(!/!/.test(line), line);
    assert.ok(!/\b(should|consider|now|hurry|act)\b/i.test(line), line);
  }
});

test("the field says where its returns came from and what kind they are", () => {
  assert.equal(
    fieldProvenance(5, "2026-08-15"),
    "5 funds from market data as of 2026-08-15 · price return year to date · " +
      "your own figure is off your fills, with buys and sells taken out · shown for scale, not rated",
  );
  /* One fund is a fund, and an unknown date is simply not stated. */
  assert.ok(fieldProvenance(1, null).startsWith("1 fund from market data · "));
});

test("the field's provenance never suggests doing anything", () => {
  const line = fieldProvenance(5, "2026-08-15");
  assert.ok(!/!/.test(line), line);
  assert.ok(!/\b(should|consider|beat|win|target|goal|hurry|act)\b/i.test(line), line);
});
