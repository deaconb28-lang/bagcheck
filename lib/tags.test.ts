import assert from "node:assert/strict";
import test from "node:test";
import {
  CORRELATION_FLOOR,
  WHY_OPTIONS,
  whyKey,
  whyLabel,
  isConviction,
  isWhy,
  progressLine,
  queueLine,
  tagProgress,
  untaggedQueue,
} from "./tags";

const entry = (externalId: string, date: string, symbol = "NVDA") => ({
  externalId,
  symbol,
  date,
  amount: 2140,
  units: 12,
  currency: "USD",
});

test("only the five offered reasons are reasons", () => {
  assert.ok(isWhy("Thesis"));
  assert.ok(isWhy("Revenge"));
  for (const bad of ["thesis", "", "Other", null, 5]) {
    assert.equal(isWhy(bad), false, `${JSON.stringify(bad)} should not be a why`);
  }
});

test("conviction is 1 to 5 and nothing else", () => {
  for (const n of [1, 2, 3, 4, 5]) assert.ok(isConviction(n));
  for (const bad of [0, 6, 2.5, "3", null]) {
    assert.equal(isConviction(bad), false, `${JSON.stringify(bad)}`);
  }
});

test("progress is clamped and never overruns the meter", () => {
  assert.equal(tagProgress(0, 200).pct, 0);
  assert.equal(tagProgress(62, 200).pct, 62);
  assert.equal(tagProgress(250, 300).pct, 100, "an over-full meter must not overflow");
  assert.equal(tagProgress(250, 300).remaining, 0);
});

test("the floor is the same number the copy quotes", () => {
  const p = tagProgress(62, 200);
  assert.equal(p.remaining, CORRELATION_FLOOR - 62);
  assert.match(progressLine(p), new RegExp(`unlock at ${CORRELATION_FLOOR}`));
  assert.match(progressLine(p), /62 of 100 tagged/);
});

test("once unlocked the line stops asking for more", () => {
  const line = progressLine(tagProgress(140, 200));
  assert.match(line, /140 of 200 entries tagged/);
  assert.ok(!/unlock/.test(line));
});

test("the queue skips what is already tagged and puts the newest first", () => {
  const queue = untaggedQueue(
    [entry("a", "2026-08-01"), entry("b", "2026-08-04"), entry("c", "2026-07-20")],
    new Set(["b"]),
  );
  assert.deepEqual(
    queue.map((e) => e.externalId),
    ["a", "c"],
  );
});

test("the queue is bounded", () => {
  const many = Array.from({ length: 40 }, (_, i) => entry(`e${i}`, `2026-07-${(i % 28) + 1}`));
  assert.equal(untaggedQueue(many, new Set()).length, 12);
  assert.equal(untaggedQueue(many, new Set(), 3).length, 3);
});

test("the queue line is descriptive and never instructs", () => {
  assert.equal(queueLine(0), "Every entry has a why on file");
  assert.equal(queueLine(1), "1 entry has no why on file");
  assert.equal(queueLine(3), "3 entries have no why on file");
  for (const n of [0, 1, 3]) {
    const line = queueLine(n);
    assert.ok(!/!/.test(line), line);
    assert.ok(!/\b(should|must|now|tag them|add)\b/i.test(line), line);
  }
});

test("stored reasons round-trip through the display spelling", () => {
  // TagDoc's union is lower-cased and documents already carry that spelling.
  for (const why of WHY_OPTIONS) {
    assert.equal(whyLabel(whyKey(why)), why, `${why} must survive a round trip`);
  }
  assert.deepEqual(WHY_OPTIONS.map(whyKey), [
    "thesis",
    "momentum",
    "saw it online",
    "felt cheap",
    "revenge",
  ]);
});

test("an unrecognised stored reason reads as nothing, never as a guess", () => {
  assert.equal(whyLabel("fomo"), null);
  assert.equal(whyLabel(null), null);
  assert.equal(whyLabel(""), null);
});
