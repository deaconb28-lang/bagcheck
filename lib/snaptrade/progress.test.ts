import assert from "node:assert/strict";
import { test } from "node:test";
import { arrivalLine, isStale, spanLabel, stepsFrom } from "./progress";
import type { SyncProgress } from "./progress";

const base: SyncProgress = {
  phase: "accounts",
  status: "running",
  error: null,
  accountsTotal: 0,
  accountsDone: 0,
  positions: 0,
  transactions: 0,
  earliestDate: null,
  elapsedMs: null,
};

test("the four steps run in order, and only one is running at a time", () => {
  const steps = stepsFrom({ ...base, phase: "history", accountsTotal: 2, accountsDone: 1 });
  assert.deepEqual(
    steps.map((s) => s.state),
    ["done", "done", "running", "waiting"],
  );
  assert.equal(steps.filter((s) => s.state === "running").length, 1);
});

test("a finished sync leaves every step done", () => {
  const steps = stepsFrom({ ...base, phase: "derive", status: "done", accountsTotal: 1 });
  assert.ok(steps.every((s) => s.state === "done"));
  assert.ok(steps.every((s) => s.fraction === 1));
});

test("a failure marks the step it failed on, not the whole run", () => {
  const steps = stepsFrom({ ...base, phase: "positions", status: "failed", accountsTotal: 1 });
  assert.deepEqual(
    steps.map((s) => s.state),
    ["done", "failed", "waiting", "waiting"],
  );
});

test("meters read the account cursor, never a synthesised curve", () => {
  const steps = stepsFrom({ ...base, phase: "positions", accountsTotal: 4, accountsDone: 3 });
  assert.equal(steps[1].fraction, 0.75);
});

test("a running step with no denominator sits at zero rather than guessing", () => {
  const steps = stepsFrom({ ...base, phase: "positions", accountsTotal: 0, accountsDone: 0 });
  assert.equal(steps[1].fraction, 0);
});

test("details carry counts the sync actually made", () => {
  const steps = stepsFrom({
    ...base,
    phase: "derive",
    accountsTotal: 2,
    accountsDone: 2,
    positions: 31,
    transactions: 2847,
  });
  assert.equal(steps[0].detail, "2 connected");
  assert.equal(steps[1].detail, "31 held");
  assert.equal(steps[2].detail, "2,847 transactions");
});

test("a waiting step shows no count", () => {
  const steps = stepsFrom({ ...base, phase: "accounts", transactions: 999 });
  assert.equal(steps[2].detail, "");
});

test("span reads in the largest unit that fits", () => {
  assert.equal(spanLabel("2023-08-08", "2026-08-08"), "Three years");
  // Past twelve the count reverts to digits, so "14 months", not "Fourteen".
  assert.equal(spanLabel("2025-06-08", "2026-08-08"), "14 months");
  assert.equal(spanLabel("2026-06-27", "2026-08-08"), "Six weeks");
  assert.equal(spanLabel("2026-08-03", "2026-08-08"), "Five days");
});

test("span refuses an empty or backwards ledger rather than printing zero", () => {
  assert.equal(spanLabel(null, "2026-08-08"), null);
  assert.equal(spanLabel("2026-09-01", "2026-08-08"), null);
  assert.equal(spanLabel("not-a-date", "2026-08-08"), null);
});

test("the arrival line states both measured halves", () => {
  const line = arrivalLine(
    { ...base, phase: "derive", status: "done", earliestDate: "2023-08-08", elapsedMs: 84_000, transactions: 2847 },
    "2026-08-08",
  );
  assert.equal(line, "Three years of history arrived in 84 seconds.");
});

test("the arrival line degrades instead of inventing a duration", () => {
  assert.equal(
    arrivalLine({ ...base, phase: "derive", status: "done", earliestDate: "2023-08-08" }, "2026-08-08"),
    "Three years of history arrived.",
  );
  assert.equal(
    arrivalLine({ ...base, phase: "derive", status: "done", transactions: 12 }, "2026-08-08"),
    "12 transactions arrived.",
  );
  assert.equal(
    arrivalLine({ ...base, phase: "derive", status: "done" }, "2026-08-08"),
    "Your brokerage returned no history to read.",
  );
});

test("one second is singular and never rounds to zero", () => {
  const line = arrivalLine(
    { ...base, phase: "derive", status: "done", earliestDate: "2026-08-03", elapsedMs: 200 },
    "2026-08-08",
  );
  assert.equal(line, "Five days of history arrived in one second.");
});

test("no copy here carries an exclamation mark or a coaching verb", () => {
  const lines = [
    arrivalLine({ ...base, phase: "derive", status: "done", earliestDate: "2023-08-08", elapsedMs: 84_000 }, "2026-08-08"),
    ...stepsFrom({ ...base, phase: "derive", status: "done", accountsTotal: 1 }).map((s) => `${s.label} ${s.detail}`),
  ];
  for (const line of lines) {
    assert.ok(!line.includes("!"), line);
    assert.ok(!/\b(you should|consider|unlock|supercharge)\b/i.test(line), line);
  }
});

/*
 * Staleness. A sync killed mid-run never writes its own failure, so the board
 * is left saying "running" and every poller waits on it forever.
 */
test("a running sync inside the window is not stale", () => {
  const began = new Date("2026-08-15T10:00:00Z");
  const now = new Date("2026-08-15T10:04:00Z");
  assert.equal(isStale("running", began, now), false);
});

test("a running sync past the window is stale", () => {
  const began = new Date("2026-08-15T10:00:00Z");
  const now = new Date("2026-08-15T10:11:00Z");
  assert.equal(isStale("running", began, now), true);
});

test("a finished sync is never stale, however old", () => {
  const began = new Date("2026-01-01T00:00:00Z");
  const now = new Date("2026-08-15T10:00:00Z");
  assert.equal(isStale("done", began, now), false);
  assert.equal(isStale("failed", began, now), false);
});

test("a run with no start time is left alone rather than guessed at", () => {
  assert.equal(isStale("running", null, new Date()), false);
});

test("an unparseable start time is left alone", () => {
  assert.equal(isStale("running", "not a date", new Date()), false);
});

test("staleness accepts an ISO string, as Mongo hands it back", () => {
  assert.equal(isStale("running", "2026-08-15T10:00:00.000Z", new Date("2026-08-15T10:20:00Z")), true);
});
