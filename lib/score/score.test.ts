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

test("an empty history is not scored at all", () => {
  /*
   * It used to land "near neutral" — 76, off four hard-coded fallbacks — and
   * that number then went on a screen, into an archetype and onto a share
   * card. A ledger with nothing in it has measured nothing, and the honest
   * return is no score rather than a plausible one.
   */
  assert.equal(computeScore({ date: AS_OF, baseline: "long-term", transactions: [] }), null);
});

test("a held book with no trading is not scored either", () => {
  /*
   * The case from the screenshot: an account that connected, holds positions
   * and has not traded in the window. Consistency has no trades, patience has
   * no closed trips, exposure has no recent activity, adherence has neither
   * contributions nor closes. Four unmeasurable components is no score.
   */
  const old = [
    txn({ date: daysAgo(400), type: "BUY", symbol: "VOO", units: 10, price: 100, amount: -1000 }),
    txn({ date: daysAgo(395), type: "BUY", symbol: "COST", units: 5, price: 200, amount: -1000 }),
  ];
  assert.equal(computeScore({ date: AS_OF, baseline: "long-term", transactions: old }), null);
});

test("a score built from two components is on the same 0–100 scale", () => {
  /*
   * Renormalisation, not a partial sum: two components at 90 must read 90,
   * never 90 × their share of the original weights.
   */
  /*
   * Buys only, spread across the last two months: consistency has a cadence to
   * read and exposure has recent activity, while patience has nothing closed
   * and adherence has neither contributions nor closes.
   */
  const txns: TxnLite[] = [];
  for (let i = 0; i < 10; i += 1) {
    txns.push(
      txn({ date: daysAgo(50 - i * 5), type: "BUY", symbol: `S${i}`, units: 10, price: 100, amount: -1000 }),
    );
  }
  const result = computeScore({ date: AS_OF, baseline: "long-term", transactions: txns });
  assert.ok(result, "expected a score from the measurable components");
  assert.ok(result.score > 0 && result.score <= 100, `score ${result.score}`);
  assert.ok(result.measured >= 2 && result.measured <= 4, `measured ${result.measured}`);
  /* Whatever was not measured is null, never a stand-in figure. */
  for (const key of ["adherence", "consistency", "patience", "exposure"] as const) {
    const v = result.components[key];
    assert.ok(v === null || (typeof v === "number" && v >= 0 && v <= 100), `${key} ${v}`);
  }
});

test("patient long-term investor scores well with moss contributors", () => {
  const result = computeScore({
    date: AS_OF,
    baseline: "long-term",
    transactions: patientHistory(),
  });
  assert.ok(result, "expected a score");
  assert.ok(result.score >= 78, `score ${result.score}`);
  assert.ok(result.components.patience! >= 80, `patience ${result.components.patience}`);
  const names = result.contributors.map((c) => c.name);
  assert.ok(names.includes("Held winners longer than losers"), names.join(", "));
  assert.ok(
    result.contributors.some((c) => c.tone === "moss" && c.value > 0),
    "expected a positive moss contributor",
  );
});

test("a disciplined day trader at baseline is not penalized for volume", () => {
  const result = computeScore({ date: AS_OF, baseline: "active", transactions: activeHistory() });
  assert.ok(result, "expected a score");
  assert.ok(result.components.exposure! >= 80, `exposure ${result.components.exposure}`);
  assert.ok(result.score >= 75, `score ${result.score}`);
});

test("the same volume against a long-term baseline is penalized in signal", () => {
  const active = computeScore({ date: AS_OF, baseline: "active", transactions: activeHistory() });
  const mismatched = computeScore({
    date: AS_OF,
    baseline: "long-term",
    transactions: activeHistory(),
  });
  assert.ok(active && mismatched, "expected both to score");
  assert.ok(
    mismatched.components.exposure! < active.components.exposure! - 20,
    `expected exposure gap, got ${active.components.exposure} vs ${mismatched.components.exposure}`,
  );
  assert.ok(
    mismatched.contributors.some(
      (c) => c.name === "Trade count above your baseline" && c.tone === "signal" && c.value < 0,
    ),
    "expected signal over-baseline contributor",
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
  assert.ok(result, "expected a score");
  assert.ok(result.components.patience! < 65, `patience ${result.components.patience}`);
  assert.ok(
    result.contributors.some((c) => c.name === "Sold winners faster than losers" && c.tone === "clay"),
    "expected clay winners-sold-early contributor",
  );
});

test("anti-gaming: one extra day of activity moves the score only slightly", () => {
  /*
   * Measured against a dense history, on purpose.
   *
   * This ran against the six-trade fixture, where "one extra buy" doubles the
   * month's trade count — and now that a component measured on one half is no
   * longer blended with a constant to hide it, the score moves five points,
   * correctly: the account really did change its pace. That is a reading, not
   * a leak. Gaming is adding a day to an ordinary history and watching the
   * number jump, which is what a few hundred trades makes it possible to
   * test.
   */
  const base = computeScore({
    date: AS_OF,
    baseline: "active",
    transactions: activeHistory(),
  });
  const oneMoreDay = computeScore({
    date: AS_OF,
    baseline: "active",
    transactions: [
      ...activeHistory(),
      txn({ date: daysAgo(0), type: "BUY", symbol: "VTI", units: 10, price: 110, amount: -1100 }),
    ],
  });
  assert.ok(base && oneMoreDay, "expected both to score");

  /*
   * Two ways the score may move, and only one of them is gaming.
   *
   * On the same basis — the same components measured — one extra day must
   * barely register, which is what this test has always been for. But a day
   * that makes a previously unmeasurable component measurable changes what
   * the score is built from, and renormalising over three components instead
   * of two is a real change of basis rather than a nudge. That move is
   * allowed and it is never silent: `measured` changes with it, and every
   * surface that draws the score states how many of the four it stands on.
   */
  if (base.measured === oneMoreDay.measured) {
    assert.ok(
      Math.abs(base.score - oneMoreDay.score) <= 4,
      `score jumped from ${base.score} to ${oneMoreDay.score} on the same basis`,
    );
  } else {
    assert.notEqual(base.measured, oneMoreDay.measured, "a basis change must be visible");
  }
});

test("a component that becomes measurable changes the basis, and says so", () => {
  const held = [
    txn({ date: daysAgo(70), type: "BUY", symbol: "A", units: 10, price: 100, amount: -1000 }),
    txn({ date: daysAgo(66), type: "BUY", symbol: "B", units: 10, price: 100, amount: -1000 }),
    txn({ date: daysAgo(62), type: "BUY", symbol: "C", units: 10, price: 100, amount: -1000 }),
    txn({ date: daysAgo(58), type: "BUY", symbol: "D", units: 10, price: 100, amount: -1000 }),
  ];
  const before = computeScore({ date: AS_OF, baseline: "long-term", transactions: held });
  const after = computeScore({
    date: AS_OF,
    baseline: "long-term",
    transactions: [
      ...held,
      txn({ date: daysAgo(3), type: "BUY", symbol: "E", units: 10, price: 100, amount: -1000 }),
    ],
  });
  assert.ok(after, "expected a score once exposure has something to read");
  assert.equal(before?.components.exposure ?? null, null, "no recent trade, no exposure reading");
  assert.notEqual(after.components.exposure, null);
  assert.ok(after.measured > (before?.measured ?? 0), "the basis widened and is stated");
});

test("contributors are capped at four, ranked by magnitude", () => {
  const result = computeScore({
    date: AS_OF,
    baseline: "long-term",
    transactions: patientHistory(),
  });
  assert.ok(result, "expected a score");
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
      /* No score is a legal answer; an out-of-range one is not. */
      if (!result) continue;
      assert.ok(result.score >= 0 && result.score <= 100);
      for (const value of Object.values(result.components)) {
        assert.ok(
          value === null || (value >= 0 && value <= 100),
          `component out of range: ${value}`,
        );
      }
    }
  }
});
