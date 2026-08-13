import assert from "node:assert/strict";
import test from "node:test";
import { buildCards } from "./kinds";
import { exampleLedger } from "./exampleLedger";
import { ROSTER, deckFrames, earnedCount, firstEarned } from "./roster";
import type { CardSpec } from "./kinds";

test("the roster names every kind the builder can produce", () => {
  const built = new Set(buildCards(exampleLedger(2026)).map((c) => c.kind));
  const named = new Set(ROSTER.map((e) => e.kind));
  for (const kind of built) {
    assert.ok(named.has(kind), `roster is missing ${kind}`);
  }
});

test("the roster has no duplicate kinds", () => {
  const kinds = ROSTER.map((e) => e.kind);
  assert.equal(new Set(kinds).size, kinds.length);
});

test("every entry states a condition and a name", () => {
  for (const e of ROSTER) {
    assert.ok(e.name.length > 0, `${e.kind} has no name`);
    assert.ok(e.requires.length > 0, `${e.kind} has no condition`);
  }
});

test("a full ledger fills every frame in the roster", () => {
  const frames = deckFrames(buildCards(exampleLedger(2026)));
  assert.equal(frames.length, ROSTER.length);
  assert.equal(earnedCount(frames), ROSTER.length);
  assert.equal(firstEarned(frames), 0);
});

test("an empty ledger still yields the whole deck, all of it locked", () => {
  const frames = deckFrames([]);
  assert.equal(frames.length, ROSTER.length);
  assert.equal(earnedCount(frames), 0);
  for (const f of frames) assert.equal(f.card, null);
});

test("frame numbers are 1-based and in roster order", () => {
  const frames = deckFrames([]);
  frames.forEach((f, i) => {
    assert.equal(f.no, i + 1);
    assert.equal(f.kind, ROSTER[i].kind);
  });
});

test("play opens on the first frame that has a card", () => {
  const all = buildCards(exampleLedger(2026));
  const onlyHealth = all.filter((c) => c.kind === "health");
  const frames = deckFrames(onlyHealth);
  assert.equal(earnedCount(frames), 1);
  assert.equal(frames[firstEarned(frames)].kind, "health");
});

test("a card the roster does not name is appended rather than dropped", () => {
  const stray = { ...buildCards(exampleLedger(2026))[0], kind: "invented" } as unknown as CardSpec;
  const frames = deckFrames([stray]);
  assert.equal(frames.length, ROSTER.length + 1);
  assert.equal(frames[frames.length - 1].kind, "invented");
  assert.equal(frames[frames.length - 1].card, stray);
});
