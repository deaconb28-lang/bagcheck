import assert from "node:assert/strict";
import { test } from "node:test";
import { archetypeByKey } from "@/lib/archetypes";
import { buildCards, cardOfKind } from "./kinds";
import type { CardInput } from "./kinds";

const full = (o: Partial<CardInput> = {}): CardInput => ({
  year: 2026,
  score: 82,
  archetype: archetypeByKey("sentinel")!,
  components: { adherence: 78, consistency: 54, patience: 84, exposure: 51 },
  trips: [
    { symbol: "ASML", openDate: "2025-06-19", closeDate: "2026-08-04", holdDays: 412, pnl: 6120, notional: 0 },
    { symbol: "NVDA", openDate: "2026-01-08", closeDate: "2026-02-20", holdDays: 43, pnl: -880, notional: 0 },
  ],
  holdTime: { winnersMean: 186, losersMean: 61, winners: 19, losers: 11 },
  dailyPnl: Array.from({ length: 250 }, (_, i) => ({
    date: `2026-${String(1 + Math.floor(i / 21)).padStart(2, "0")}-${String((i % 21) + 1).padStart(2, "0")}`,
    realised: (i % 7) - 3,
  })),
  equity: Array.from({ length: 200 }, (_, i) => ({
    date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
    // Rises, then gives back 25% — a drawdown the card should find.
    value: i < 120 ? 50000 + i * 100 : 62000 - (i - 120) * 190,
  })),
  scoredDays: 214,
  transactionCount: 2847,
  panicSells: 0,
  streakDays: 41,
  streakName: "Sessions inside your exposure band",
  weeklySessions: [3, 4, 3, 5, 4, 3, 4, 4, 2, 5, 4, 3],
  ...o,
});

test("a full history earns all twelve", () => {
  const kinds = buildCards(full()).map((c) => c.kind);
  assert.equal(kinds.length, 12);
  assert.equal(new Set(kinds).size, 12);
});

test("every card makes exactly one statement", () => {
  for (const card of buildCards(full())) {
    assert.ok(["figure", "beats", "chart"].includes(card.body.kind), card.kind);
    if (card.body.kind === "beats") assert.ok(card.body.beats.length <= 3, card.kind);
  }
});

test("an empty history earns nothing rather than twelve empty cards", () => {
  const bare = buildCards({
    ...full(),
    score: null,
    components: null,
    trips: [],
    holdTime: { winnersMean: null, losersMean: null, winners: 0, losers: 0 },
    dailyPnl: [],
    equity: [],
    scoredDays: 0,
    transactionCount: 0,
    streakDays: 0,
    weeklySessions: [],
  });
  assert.deepEqual(bare, []);
});

test("each kind holds its own sample floor", () => {
  // One short hold is not a longest-hold card.
  assert.equal(
    cardOfKind(full({ trips: [{ symbol: "X", openDate: "a", closeDate: "b", holdDays: 12, pnl: 5, notional: 0 }] }), "longestHold"),
    null,
  );
  // Six winners is not enough to claim a ratio.
  assert.equal(
    cardOfKind(full({ holdTime: { winnersMean: 100, losersMean: 10, winners: 6, losers: 20 } }), "holdRatio"),
    null,
  );
  // A quarter's worth of sessions is what makes "no panic sells" mean anything.
  assert.equal(cardOfKind(full({ scoredDays: 20 }), "noPanic"), null);
  assert.equal(cardOfKind(full({ streakDays: 6 }), "streak"), null);
  assert.equal(cardOfKind(full({ weeklySessions: [3, 4] }), "cadence"), null);
  assert.equal(cardOfKind(full({ scoredDays: 90 }), "wrapped"), null);
});

test("a single panic sell removes the card entirely", () => {
  assert.ok(cardOfKind(full(), "noPanic"));
  assert.equal(cardOfKind(full({ panicSells: 1 }), "noPanic"), null);
});

test("the drawdown card reads the real curve, not a claim", () => {
  const card = cardOfKind(full(), "drawdownHeld");
  // 62000 peak down to 62000 − 79×190 = 46,990 → about 24%.
  assert.equal(card?.body.kind, "figure");
  assert.match(card!.body.kind === "figure" ? card!.body.value : "", /^−2[34]$/);
  assert.equal(card?.rarity, "rare");
});

test("a curve that only rises earns no drawdown card", () => {
  const rising = full({
    equity: Array.from({ length: 200 }, (_, i) => ({ date: "2026-01-01", value: 50000 + i * 10 })),
  });
  assert.equal(cardOfKind(rising, "drawdownHeld"), null);
});

test("the hold-ratio card names the direction it actually found", () => {
  const runs = cardOfKind(full(), "holdRatio");
  assert.equal(runs?.headline, "Run");
  const lingers = cardOfKind(
    full({ holdTime: { winnersMean: 20, losersMean: 90, winners: 19, losers: 11 } }),
    "holdRatio",
  );
  assert.equal(lingers?.headline, "Linger");
  assert.match(lingers!.lede, /not working/);
});

test("rarity is decided by conduct, and nothing about tiers reaches it", () => {
  assert.equal(cardOfKind(full({ score: 95 }), "health")?.rarity, "rare");
  assert.equal(cardOfKind(full({ score: 70 }), "health")?.rarity, null);
  assert.equal(cardOfKind(full({ streakDays: 120 }), "streak")?.rarity, "rare");
  assert.equal(cardOfKind(full({ streakDays: 20 }), "streak")?.rarity, null);
});

test("only the archetype with all four components above the bar is rare", () => {
  assert.equal(cardOfKind(full(), "archetype")?.rarity, null);
  const composed = full({
    archetype: archetypeByKey("composed")!,
    components: { adherence: 80, consistency: 80, patience: 80, exposure: 80 },
  });
  assert.equal(cardOfKind(composed, "archetype")?.rarity, "rare");
});

test("no card headline or lede coaches, exclaims or names a benchmark", () => {
  for (const card of buildCards(full())) {
    const text = `${card.kicker} ${card.headline} ${card.lede}`;
    assert.ok(!text.includes("!"), card.kind);
    assert.ok(!/\b(you should|consider|beat|outperform|s&p|market|index|nasdaq)\b/i.test(text), `${card.kind}: ${text}`);
  }
});

test("a chart card ships as many labels as bars, or none at all", () => {
  for (const card of buildCards(full())) {
    if (card.body.kind !== "chart" || !card.body.labels) continue;
    assert.equal(card.body.labels.length, card.body.strip.length, card.kind);
  }
});
