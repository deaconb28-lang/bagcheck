import assert from "node:assert/strict";
import { test } from "node:test";
import { activeStreaks, disciplineSegments, selfPercentile } from "./shape";
import type { ScoredDay } from "./shape";

function day(partial: Partial<ScoredDay> & { date: string }): ScoredDay {
  return {
    score: 80,
    components: { adherence: 80, consistency: 80, patience: 80, exposure: 80 },
    contributors: [],
    ...partial,
  };
}

test("segments pad to a full quarter, oldest first", () => {
  const segments = disciplineSegments([day({ date: "2026-08-07" })]);
  assert.equal(segments.length, 63);
  assert.equal(segments[62], "kept", "most recent day sits last");
  assert.ok(segments.slice(0, 62).every((s) => s === "empty"));
});

test("segments classify by score and exposure", () => {
  const segments = disciplineSegments(
    [
      day({ date: "2026-08-01", score: 90 }),
      day({ date: "2026-08-02", score: 70 }),
      day({ date: "2026-08-03", score: 40 }),
      day({
        date: "2026-08-04",
        score: 95,
        components: { adherence: 90, consistency: 90, patience: 90, exposure: 30 },
      }),
    ],
    4,
  );
  assert.deepEqual(segments, ["kept", "partial", "empty", "exposed"]);
});

test("segments keep only the most recent window", () => {
  const days = Array.from({ length: 80 }, (_, i) =>
    day({ date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}` }),
  );
  assert.equal(disciplineSegments(days, 63).length, 63);
});

test("streaks count back from the most recent day and stop at a break", () => {
  const days = [
    day({ date: "2026-08-07", score: 85 }),
    day({ date: "2026-08-06", score: 80 }),
    day({ date: "2026-08-05", score: 40 }), // breaks it
    day({ date: "2026-08-04", score: 90 }),
  ];
  const streaks = activeStreaks(days);
  const insideRules = streaks.find((s) => s.name === "days inside your rules");
  assert.equal(insideRules?.days, 2);
});

test("a clay contributor today means no costly-exit streak", () => {
  const days = [
    day({ date: "2026-08-07", contributors: [{ name: "Sold winners early", value: -4, tone: "clay" }] }),
    day({ date: "2026-08-06" }),
    day({ date: "2026-08-05" }),
  ];
  assert.equal(
    activeStreaks(days).some((s) => s.name === "days without a costly exit"),
    false,
  );
});

test("streaks shorter than two days are not at stake", () => {
  assert.deepEqual(activeStreaks([day({ date: "2026-08-07" })]), []);
  assert.deepEqual(activeStreaks([]), []);
});

test("streaks are ranked longest first and capped at three", () => {
  const days = Array.from({ length: 10 }, (_, i) =>
    day({ date: `2026-08-${String(10 - i).padStart(2, "0")}` }),
  );
  const streaks = activeStreaks(days);
  assert.ok(streaks.length <= 3);
  for (let i = 1; i < streaks.length; i++) {
    assert.ok(streaks[i - 1].days >= streaks[i].days);
  }
});

test("percentile needs a real history before it reports", () => {
  assert.equal(selfPercentile([day({ date: "2026-08-07" })], 80), null);
  const days = Array.from({ length: 10 }, (_, i) =>
    day({ date: `2026-08-0${i}`, score: 60 + i }),
  );
  assert.equal(selfPercentile(days, 69), 90);
});
