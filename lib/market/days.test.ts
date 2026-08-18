import assert from "node:assert/strict";
import test from "node:test";
import { INSIGHTS_MARKET_DAYS, insightsGate, marketDaysBetween } from "./days";

test("the day you connect is not a day you have been connected", () => {
  const d = new Date("2026-03-02T00:00:00Z"); // a Monday
  assert.equal(marketDaysBetween(d, d), 0);
});

test("weekends do not count", () => {
  /* Mon 2 Mar → Sat 7 Mar: Tue, Wed, Thu, Fri = 4. */
  assert.equal(
    marketDaysBetween(new Date("2026-03-02T00:00:00Z"), new Date("2026-03-07T00:00:00Z")),
    4,
  );
  /* Through Sunday is still 4 — the weekend adds nothing. */
  assert.equal(
    marketDaysBetween(new Date("2026-03-02T00:00:00Z"), new Date("2026-03-08T00:00:00Z")),
    4,
  );
});

test("two full weeks of weekdays is ten", () => {
  assert.equal(
    marketDaysBetween(new Date("2026-03-02T00:00:00Z"), new Date("2026-03-16T00:00:00Z")),
    10,
  );
});

test("a clock that has not started is not a clock at zero", () => {
  const gate = insightsGate(null, new Date("2026-06-01T00:00:00Z"));
  assert.equal(gate.unlocked, false);
  assert.equal(gate.have, 0);
  assert.equal(gate.left, INSIGHTS_MARKET_DAYS);
});

test("the gate opens on the tenth market day and not before", () => {
  const connected = new Date("2026-03-02T00:00:00Z");
  const ninth = insightsGate(connected, new Date("2026-03-13T00:00:00Z"));
  assert.equal(ninth.have, 9);
  assert.equal(ninth.unlocked, false);
  assert.equal(ninth.left, 1);

  const tenth = insightsGate(connected, new Date("2026-03-16T00:00:00Z"));
  assert.equal(tenth.have, 10);
  assert.equal(tenth.unlocked, true);
  assert.equal(tenth.left, 0);
});

test("time only ever moves forward through the gate", () => {
  const connected = new Date("2026-03-02T00:00:00Z");
  /* A clock read before the connection is zero, never negative. */
  assert.equal(insightsGate(connected, new Date("2026-02-01T00:00:00Z")).have, 0);
});
