import assert from "node:assert/strict";
import test from "node:test";
import { artPrompt, wrappedTail, type WrappedYear } from "./prompt";

const year = (o: Partial<WrappedYear> = {}): WrappedYear => ({
  year: 2026, archetype: "Patient accumulator", dominant: "patience",
  scoredDays: 214, longestHold: 412, ...o,
});

test("the prompt forbids everything that would break the system", () => {
  const p = artPrompt(year()).toLowerCase();
  for (const rule of ["no text", "no logos", "no people", "landscape only"]) {
    assert.ok(p.includes(rule), `prompt must state "${rule}"`);
  }
});

test("the prompt never asks for a glyph, a chart or a number", () => {
  const p = artPrompt(year());
  /*
   * The card's own numerals are set by us. A model drawing "9.4" produces a
   * figure nobody can correct after the fact, on an artefact whose entire
   * claim is that its numbers came from a brokerage — so this assertion is
   * the load-bearing one in the file.
   */
  assert.match(p, /no text, letters, numbers, words, digits or symbols anywhere/i);
  assert.match(p, /No logos, charts, graphs, bars, arrows/);
});

test("each dominant component asks for a different motion", () => {
  const seen = new Set(
    (["adherence", "consistency", "patience", "exposure"] as const).map(
      (d) => artPrompt(year({ dominant: d })),
    ),
  );
  assert.equal(seen.size, 4, "art should reflect the behaviour, not be wallpaper");
});

test("a long hold changes the composition, a short one does not", () => {
  assert.notEqual(artPrompt(year({ longestHold: 412 })), artPrompt(year({ longestHold: 20 })));
  assert.equal(artPrompt(year({ longestHold: 20 })), artPrompt(year({ longestHold: null })));
});

test("the prompt keeps the top clear for the headline", () => {
  // Stated as composition, not as a request for room: a model follows "the
  // top third is empty sky" and ignores "leave space for a headline".
  assert.match(artPrompt(year()), /top third is empty, near-black sky/);
  assert.match(artPrompt(year()), /2:3 portrait/);
});

test("each hue asks for its own light, so scene and type read as one object", () => {
  const seen = new Set(
    (["moss", "ember", "azure", "violet"] as const).map((hue) => artPrompt(year({ hue }))),
  );
  assert.equal(seen.size, 4);
  assert.match(artPrompt(year({ hue: "ember" })), /blazing orange sun/);
  // An unknown hue falls back rather than dropping the light clause entirely.
  assert.match(artPrompt(year({ hue: undefined })), /emerald-green sun/);
});

test("the tail reads as a sentence, with the right article", () => {
  assert.equal(wrappedTail(year()), "214 scored days as a patient accumulator");
  assert.equal(
    wrappedTail(year({ archetype: "Active trader", scoredDays: 61 })),
    "61 scored days as an active trader",
  );
});

test("a named scene overrides the per-component fallback", () => {
  const withScene = artPrompt(year({ scene: "a perfectly still glacial lake" }));
  assert.match(withScene, /a perfectly still glacial lake/);
  // The fallback motion must not also appear — one subject per image.
  assert.ok(!withScene.includes("sea of low cloud"));
});
