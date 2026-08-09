import assert from "node:assert/strict";
import { test } from "node:test";
import { archetypeByKey } from "@/lib/archetypes";
import { buildCards, cardOfKind } from "@/lib/cards/kinds";
import type { CardInput } from "@/lib/cards/kinds";
import { SCENE } from "./scenes";
import { artPromptFor, briefKey, densityScale, directionOf, textureOf } from "./brief";
import type { ArtBrief } from "./brief";

const brief = (o: Partial<ArtBrief> = {}): ArtBrief => ({
  kind: "longestHold",
  hue: "ember",
  scene: SCENE.longestHold,
  shape: { magnitude: 0.5, direction: "up", texture: 0.3, density: 20 },
  ...o,
});

test("texture reads how uneven a series is, not how big it is", () => {
  assert.equal(textureOf([5, 5, 5, 5, 5]), 0);
  // Same shape, ten times the scale — the reading is unchanged.
  assert.equal(
    textureOf([1, -1, 1, -1, 1]).toFixed(3),
    textureOf([10, -10, 10, -10, 10]).toFixed(3),
  );
  assert.ok(textureOf([1, -1, 1, -1, 1]) > textureOf([1, 2, 3, 4, 5]));
});

test("direction needs a real move, not a rounding difference", () => {
  assert.equal(directionOf([1, 2, 3, 9]), "up");
  assert.equal(directionOf([9, 3, 2, 1]), "down");
  assert.equal(directionOf([100, 101, 100, 100.5]), "flat");
  assert.equal(directionOf([7]), "flat");
});

test("counts are logarithmic — 200 trips is not 100× the picture of 2", () => {
  assert.equal(densityScale(1), 0);
  assert.ok(densityScale(3000) <= 1);
  assert.ok(densityScale(200) - densityScale(20) < densityScale(20) - densityScale(2) + 0.2);
});

test("different numbers ask for a different picture", () => {
  const small = artPromptFor(brief({ shape: { magnitude: 0.05, direction: "flat", texture: 0, density: 1 } }));
  const huge = artPromptFor(brief({ shape: { magnitude: 0.99, direction: "up", texture: 0.95, density: 900 } }));
  assert.notEqual(small, huge);
  assert.match(small, /small and distant/);
  assert.match(huge, /colossal/);
  assert.match(huge, /shattered/);
  assert.match(small, /single form standing alone/);
});

test("the same numbers ask for the same picture — art is generated once", () => {
  assert.equal(artPromptFor(brief()), artPromptFor(brief()));
  assert.equal(briefKey(brief()), briefKey(brief()));
});

test("the key bands, so a small move reuses the image rather than redrawing", () => {
  const a = brief({ shape: { magnitude: 0.41, direction: "up", texture: 0.3, density: 20 } });
  const b = brief({ shape: { magnitude: 0.43, direction: "up", texture: 0.3, density: 20 } });
  assert.equal(briefKey(a), briefKey(b));
  const far = brief({ shape: { magnitude: 0.95, direction: "up", texture: 0.3, density: 20 } });
  assert.notEqual(briefKey(a), briefKey(far));
});

test("every prompt forbids the model from drawing a number", () => {
  for (const kind of Object.keys(SCENE) as Array<keyof typeof SCENE>) {
    const prompt = artPromptFor(brief({ kind, scene: SCENE[kind] }));
    assert.match(prompt, /no text, letters, numbers, digits/i, kind);
    assert.match(prompt, /No logos, charts, graphs/, kind);
  }
});

test("no prompt ever contains a figure from the card", () => {
  // The whole split: the data shapes the composition and is never rendered.
  const prompt = artPromptFor(brief({ shape: { magnitude: 0.87, direction: "up", texture: 0.42, density: 412 } }));
  assert.ok(!/\b(412|0\.87|87%|42)\b/.test(prompt), prompt);
});

test("each kind keeps its own scene inside the brief", () => {
  for (const kind of Object.keys(SCENE) as Array<keyof typeof SCENE>) {
    assert.match(artPromptFor(brief({ kind, scene: SCENE[kind] })), new RegExp(escape(SCENE[kind])));
  }
});

/* ── The end-to-end claim: two ledgers, twelve different pictures each ──── */

const ledger = (o: Partial<CardInput> = {}): CardInput => ({
  year: 2026,
  score: 82,
  archetype: archetypeByKey("sentinel")!,
  components: { adherence: 78, consistency: 54, patience: 84, exposure: 51 },
  trips: [
    { symbol: "ASML", openDate: "2025-06-19", closeDate: "2026-08-04", holdDays: 412, pnl: 6120, notional: 0 },
    { symbol: "NVDA", openDate: "2026-01-08", closeDate: "2026-02-20", holdDays: 43, pnl: -880, notional: 0 },
  ],
  holdTime: { winnersMean: 186, losersMean: 61, winners: 19, losers: 11 },
  dailyPnl: Array.from({ length: 250 }, (_, i) => ({ date: "2026-01-01", realised: (i % 7) - 3 })),
  equity: Array.from({ length: 200 }, (_, i) => ({
    date: "2026-01-01",
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

test("two different ledgers draw two different sets of pictures", () => {
  const mine = buildCards(ledger()).map((c) =>
    briefKey({ kind: c.kind, hue: c.hue, scene: SCENE[c.kind], shape: c.art }),
  );
  const theirs = buildCards(
    ledger({
      score: 51,
      // A different person: every input moves, so every picture should.
      archetype: archetypeByKey("improviser")!,
      components: { adherence: 41, consistency: 38, patience: 22, exposure: 55 },
      streakDays: 96,
      holdTime: { winnersMean: 20, losersMean: 90, winners: 40, losers: 40 },
      trips: [
        { symbol: "TSLA", openDate: "a", closeDate: "b", holdDays: 38, pnl: 120, notional: 0 },
        { symbol: "GME", openDate: "a", closeDate: "b", holdDays: 4, pnl: -60, notional: 0 },
      ],
      // A violent book rather than a steady one.
      dailyPnl: Array.from({ length: 250 }, (_, i) => ({
        date: "2026-01-01",
        realised: i % 2 ? 900 : -880,
      })),
      // A curve that climbs the whole way, so there is no drawdown to hold.
      equity: Array.from({ length: 200 }, (_, i) => ({ date: "2026-01-01", value: 20000 + i * 260 })),
      weeklySessions: [1, 9, 2, 12, 1, 14, 2, 11, 3, 15, 1, 10],
      scoredDays: 190,
      transactionCount: 140,
    }),
  ).map((c) => briefKey({ kind: c.kind, hue: c.hue, scene: SCENE[c.kind], shape: c.art }));

  const shared = mine.filter((k) => theirs.includes(k));
  assert.ok(
    shared.length <= 1,
    `two unrelated ledgers should not share most of their art: ${shared.join(", ")}`,
  );
});

test("every card carries a usable art shape", () => {
  for (const card of buildCards(ledger())) {
    assert.ok(card.art.magnitude >= 0 && card.art.magnitude <= 1, card.kind);
    assert.ok(card.art.texture >= 0 && card.art.texture <= 1, card.kind);
    assert.ok(Number.isFinite(card.art.density), card.kind);
  }
});

test("a bigger hold draws a bigger mountain", () => {
  const long = cardOfKind(ledger(), "longestHold")!;
  const short = cardOfKind(
    ledger({ trips: [{ symbol: "X", openDate: "a", closeDate: "b", holdDays: 40, pnl: 10, notional: 0 }] }),
    "longestHold",
  )!;
  assert.ok(long.art.magnitude > short.art.magnitude);
});

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
