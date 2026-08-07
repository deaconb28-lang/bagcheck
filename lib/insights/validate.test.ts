import assert from "node:assert/strict";
import { test } from "node:test";
import { fallbackInsight } from "./fallback";
import { allowedNumbers } from "./prompt";
import type { InsightFacts } from "./types";
import { validateInsight } from "./validate";

const ok = { sentence: "You held through three straight down weeks.", tail: "Your cadence has not moved since June." };

test("accepts on-voice copy", () => {
  assert.equal(validateInsight(ok).ok, true);
});

test("rejects exclamation marks", () => {
  const result = validateInsight({ ...ok, sentence: "You held through the drawdown!" });
  assert.equal(result.ok, false);
  assert.match(result.reason!, /exclamation/);
});

test("rejects prescriptive copy", () => {
  for (const sentence of [
    "You should hold longer next time.",
    "Consider trimming your position.",
    "Try to keep your sizing steady.",
    "We recommend holding through the next drawdown.",
  ]) {
    const result = validateInsight({ ...ok, sentence });
    assert.equal(result.ok, false, `should reject: ${sentence}`);
    assert.match(result.reason!, /prescriptive/);
  }
});

test("rejects coaching and congratulation", () => {
  for (const tail of ["Great job this week.", "Keep it up.", "That is impressive."]) {
    const result = validateInsight({ ...ok, tail });
    assert.equal(result.ok, false, `should reject: ${tail}`);
    assert.match(result.reason!, /coaching/);
  }
});

test("rejects benchmark and peer comparison", () => {
  for (const tail of [
    "You are beating the S&P this quarter.",
    "That outperforms the market average.",
    "You held longer than most investors.",
  ]) {
    const result = validateInsight({ ...ok, tail });
    assert.equal(result.ok, false, `should reject: ${tail}`);
    assert.match(result.reason!, /benchmark/);
  }
});

test("rejects urgency and advice", () => {
  assert.equal(validateInsight({ ...ok, sentence: "Act fast on this." }).ok, false);
  assert.equal(validateInsight({ ...ok, tail: "Rebalance before the close." }).ok, false);
});

test("rejects emoji", () => {
  const result = validateInsight({ ...ok, sentence: "You held through the drawdown 🎉" });
  assert.equal(result.ok, false);
  assert.match(result.reason!, /emoji/);
});

test("rejects invented numbers, accepts computed ones", () => {
  const allowed = [82, 9, 5];
  assert.equal(
    validateInsight({ sentence: "Your score reads 82.", tail: "Holding added 9." }, allowed).ok,
    true,
  );
  const result = validateInsight(
    { sentence: "Your score reads 82.", tail: "You are up 47% this year." },
    allowed,
  );
  assert.equal(result.ok, false);
  assert.match(result.reason!, /47/);
});

test("rejects over-length and empty copy", () => {
  assert.equal(validateInsight({ ...ok, sentence: "x".repeat(200) }).ok, false);
  assert.equal(validateInsight({ ...ok, sentence: "  " }).ok, false);
});

const FACTS: InsightFacts = {
  date: "2026-08-07",
  baseline: "long-term",
  score: 82,
  previousScore: 79,
  weekDelta: 3,
  components: { adherence: 80, consistency: 84, patience: 88, exposure: 70 },
  contributors: [
    { name: "Held through the drawdown", value: 9, tone: "gold" },
    { name: "Sold two winners early", value: -4, tone: "clay" },
  ],
  transactionCount: 412,
  accountCount: 2,
};

test("the fallback readout passes its own copy rules", () => {
  const insight = fallbackInsight(FACTS);
  const result = validateInsight(insight, allowedNumbers(FACTS));
  assert.equal(result.ok, true, result.reason);
  assert.equal(insight.source, "fallback");
});

test("the empty-history fallback also passes", () => {
  const bare: InsightFacts = { ...FACTS, contributors: [], previousScore: null, weekDelta: null };
  const result = validateInsight(fallbackInsight(bare), allowedNumbers(bare));
  assert.equal(result.ok, true, result.reason);
});

test("allowedNumbers covers every figure the facts expose", () => {
  const numbers = allowedNumbers(FACTS);
  for (const value of [82, 79, 3, 88, 70, 9, 4, 412, 2]) {
    assert.ok(numbers.map(Math.abs).includes(value), `missing ${value}`);
  }
});
