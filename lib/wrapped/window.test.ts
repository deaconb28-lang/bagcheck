import assert from "node:assert/strict";
import test from "node:test";
import { quarterOf, quarterWindow, windowFor, windowsFor, yearWindow } from "./window";

const at = (iso: string) => new Date(iso);

test("a quarter runs from its first day to the next quarter's first day", () => {
  assert.deepEqual(quarterWindow(2026, 1), {
    key: "q1", label: "Q1 2026", from: "2026-01-01", to: "2026-04-01", quarter: 1,
  });
  assert.deepEqual(quarterWindow(2026, 3), {
    key: "q3", label: "Q3 2026", from: "2026-07-01", to: "2026-10-01", quarter: 3,
  });
});

test("Q4 ends where the next year begins", () => {
  /* Exclusive, so the 31st of December is inside it and the 1st is not. */
  const q4 = quarterWindow(2026, 4);
  assert.equal(q4.to, "2027-01-01");
  assert.ok("2026-12-31" >= q4.from && "2026-12-31" < q4.to);
  assert.ok(!("2027-01-01" < q4.to));
});

test("the year is the four quarters end to end", () => {
  const year = yearWindow(2026);
  assert.equal(year.from, quarterWindow(2026, 1).from);
  assert.equal(year.to, quarterWindow(2026, 4).to);
});

test("quarters that have not started are not offered", () => {
  /* August is Q3, so Q4 is not a window anybody can be shown yet. */
  const keys = windowsFor(2026, at("2026-08-17T00:00:00Z")).map((w) => w.key);
  assert.deepEqual(keys, ["year", "q1", "q2", "q3"]);
});

test("a finished year offers all four", () => {
  const keys = windowsFor(2025, at("2026-08-17T00:00:00Z")).map((w) => w.key);
  assert.deepEqual(keys, ["year", "q1", "q2", "q3", "q4"]);
});

test("quarterOf reads the boundaries the same way the windows do", () => {
  assert.equal(quarterOf(at("2026-01-01T00:00:00Z")), 1);
  assert.equal(quarterOf(at("2026-03-31T23:59:59Z")), 1);
  assert.equal(quarterOf(at("2026-04-01T00:00:00Z")), 2);
  assert.equal(quarterOf(at("2026-12-31T00:00:00Z")), 4);
});

test("an unknown or future window falls back to the year, never to an empty deck", () => {
  const now = at("2026-08-17T00:00:00Z");
  assert.equal(windowFor(2026, undefined, now).key, "year");
  assert.equal(windowFor(2026, "nonsense", now).key, "year");
  assert.equal(windowFor(2026, "q9", now).key, "year");
  /* Q4 has not begun in August. */
  assert.equal(windowFor(2026, "q4", now).key, "year");
  assert.equal(windowFor(2026, "q3", now).key, "q3");
});
