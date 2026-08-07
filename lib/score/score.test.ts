import assert from "node:assert/strict";
import { test } from "node:test";
import { inferBaseline } from "./baseline";
import { computeScore } from "./score";
import type { ScoreInput, TxnLite } from "./types";

const AS_OF = "2026-08-07";
const DAY_MS = 86_400_000;

function daysAgo(days: number): string {
  return new Date(Date.parse(AS_OF) - days * DAY_MS).toISOString().slice(0, 10);
}

function txn(partial: Partial<TxnLite>): TxnLite {
  return {
    date: null,
    type: null,
    symbol: null,
    units: null,
    price: null,
    amount: null,
    ...partial,
  };
}

/** A patient long-term investor: monthly buys, held winners, steady deposits. */
function patientHistory(): TxnLite[] {
  const txns: TxnLite[] = [];
  for (let month = 0; month < 6; month++) {
    txns.push(
      txn({
        date: daysAgo(30 * month + 5),
        type: "BUY",
        symbol: "VTI",
        units: 10,
        price: 100 + month,
        amount: -(1000 + month * 10),
      }),
      txn({
        date: daysAgo(30 * month + 3),
        type: "CONTRIBUTION",
        amount: 1000,
      }),
    );
  }
  // One winner held 60 days, one loser cut at 6 days.
  txns.push(
    txn({ date: daysAgo(70), type: "BUY", symbol: "MSFT", units: 5, price: 100, amount: -500 }),
    txn({ date: daysAgo(10), type: "SELL", symbol: "MSFT", units: 5, price: 130, amount: 650 }),
    txn({ date: daysAgo(40), type: "BUY", symbol: "MEME", units: 5, price: 50, amount: -250 }),
    txn({ date: daysAgo(34), type: "SELL", symbol: "MEME", units: 5, price: 45, amount: 225 }),
    txn({ date: daysAgo(90), type: "BUY", symbol: "GOOG", units: 4, price: 150, amount: -600 }),
    txn({ date: daysAgo(15), type: "SELL", symbol: "GOOG", units: 4, price: 170, amount: 680 }),
  );
  return txns;
}

/** An active trader at their own baseline: ~40 trades/week, steady. */
function activeHistory(): TxnLite[] {
  const txns: TxnLite[] = [];
  const symbols = ["SPY", "QQQ", "IWM", "NVDA", "AMD", "TSLA"];
  for (let day = 0; day < 112; day++) {
    if (day % 7 >= 5) continue; // weekdays only
    for (let i = 0; i < 4; i++) {
      const symbol = symbols[(day + i) % symbols.length];
      txns.push(
        txn({ date: daysAgo(day), type: "BUY", symbol, units: 10, price: 100, amount: -1000 }),
        txn({ date: daysAgo(day), type: "SELL", symbol, units: 10, price: 100.5, amount: 1005 }),
      );
    }
  }
  return txns;
}

test("empty history lands near neutral, no contributors", () => {
  const result = computeScore({ date: AS_OF, baseline: "long-term", transactions: [] });
  assert.ok(result.score >= 65 && result.score <= 85, `score ${result.score}`);
  assert.equal(result.contributors.length, 0);
});

test("patient long-term investor scores well with gold contributors", () => {
  const result = computeScore({
    date: AS_OF,
    baseline: "long-term",
    transactions: patientHistory(),
  });
  assert.ok(result.score >= 78, `score ${result.score}`);
  assert.ok(result.components.patience >= 80, `patience ${result.components.patience}`);
  const names = result.contributors.map((c) => c.name);
  assert.ok(names.includes("Held winners longer than losers"), names.join(", "));
  assert.ok(
    result.contributors.some((c) => c.tone === "gold" && c.value > 0),
    "expected a positive gold contributor",
  );
});

test("a disciplined day trader at baseline is not penalized for volume", () => {
  const result = computeScore({ date: AS_OF, baseline: "active", transactions: activeHistory() });
  assert.ok(result.components.exposure >= 80, `exposure ${result.components.exposure}`);
  assert.ok(result.score >= 75, `score ${result.score}`);
});

test("the same volume against a long-term baseline is penalized in violet", () => {
  const active = computeScore({ date: AS_OF, baseline: "active", transactions: activeHistory() });
  const mismatched = computeScore({
    date: AS_OF,
    baseline: "long-term",
    transactions: activeHistory(),
  });
  assert.ok(
    mismatched.components.exposure < active.components.exposure - 20,
    `expected exposure gap, got ${active.components.exposure} vs ${mismatched.components.exposure}`,
  );
  assert.ok(
    mismatched.contributors.some(
      (c) => c.name === "Trade count above your baseline" && c.tone === "violet" && c.value < 0,
    ),
    "expected violet over-baseline contributor",
  );
});

test("selling winners faster than losers is a clay contributor", () => {
  const txns: TxnLite[] = [
    // Winners flipped in 2 days.
    txn({ date: daysAgo(30), type: "BUY", symbol: "W1", units: 10, price: 100, amount: -1000 }),
    txn({ date: daysAgo(28), type: "SELL", symbol: "W1", units: 10, price: 110, amount: 1100 }),
    txn({ date: daysAgo(20), type: "BUY", symbol: "W2", units: 10, price: 100, amount: -1000 }),
    txn({ date: daysAgo(18), type: "SELL", symbol: "W2", units: 10, price: 108, amount: 1080 }),
    // Loser held 50 days.
    txn({ date: daysAgo(60), type: "BUY", symbol: "L1", units: 10, price: 100, amount: -1000 }),
    txn({ date: daysAgo(10), type: "SELL", symbol: "L1", units: 10, price: 80, amount: 800 }),
  ];
  const result = computeScore({ date: AS_OF, baseline: "swing", transactions: txns });
  assert.ok(result.components.patience < 65, `patience ${result.components.patience}`);
  assert.ok(
    result.contributors.some((c) => c.name === "Sold winners faster than losers" && c.tone === "clay"),
    "expected clay winners-sold-early contributor",
  );
});

test("anti-gaming: one extra day of activity moves the score only slightly", () => {
  const base = computeScore({
    date: AS_OF,
    baseline: "long-term",
    transactions: patientHistory(),
  });
  const oneMoreDay = computeScore({
    date: AS_OF,
    baseline: "long-term",
    transactions: [
      ...patientHistory(),
      txn({ date: daysAgo(0), type: "BUY", symbol: "VTI", units: 10, price: 110, amount: -1100 }),
    ],
  });
  assert.ok(
    Math.abs(base.score - oneMoreDay.score) <= 4,
    `score jumped from ${base.score} to ${oneMoreDay.score}`,
  );
});

test("contributors are capped at four, ranked by magnitude", () => {
  const result = computeScore({
    date: AS_OF,
    baseline: "long-term",
    transactions: patientHistory(),
  });
  assert.ok(result.contributors.length <= 4);
  for (let i = 1; i < result.contributors.length; i++) {
    assert.ok(
      Math.abs(result.contributors[i - 1].value) >= Math.abs(result.contributors[i].value),
    );
  }
});

test("baseline inference tracks observed cadence", () => {
  assert.equal(inferBaseline([], AS_OF), "long-term");
  assert.equal(inferBaseline(patientHistory(), AS_OF), "long-term");
  assert.equal(inferBaseline(activeHistory(), AS_OF), "active");
});

test("score components stay within 0–100", () => {
  for (const transactions of [[], patientHistory(), activeHistory()]) {
    for (const baseline of ["long-term", "swing", "active"] as const) {
      const input: ScoreInput = { date: AS_OF, baseline, transactions };
      const result = computeScore(input);
      assert.ok(result.score >= 0 && result.score <= 100);
      for (const value of Object.values(result.components)) {
        assert.ok(value >= 0 && value <= 100, `component out of range: ${value}`);
      }
    }
  }
});
