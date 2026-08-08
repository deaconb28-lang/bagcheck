import assert from "node:assert/strict";
import test from "node:test";
import { artPrompt, wrappedTail, type WrappedYear } from "./prompt";

const year = (o: Partial<WrappedYear> = {}): WrappedYear => ({
  year: 2026, archetype: "Patient accumulator", dominant: "patience",
  scoredDays: 214, longestHold: 412, ...o,
});

test("the prompt forbids everything that would break the system", () => {
  const p = artPrompt(year()).toLowerCase();
  for (const rule of ["no text", "no logos", "no people", "abstract", "flat and matte"]) {
    assert.ok(p.includes(rule), `prompt must state "${rule}"`);
  }
});

test("the prompt never asks for a chart or a number", () => {
  const p = artPrompt(year());
  // The card's own numerals are set in Outfit by us; the model drawing any
  // would be both wrong and unfixable after the fact.
  assert.match(p, /No text, letters, numbers/);
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

test("the prompt keeps the centre clear for type", () => {
  assert.match(artPrompt(year()), /centre and lower half must stay quiet/);
});

test("the tail reads as a sentence, with the right article", () => {
  assert.equal(wrappedTail(year()), "214 scored days as a patient accumulator");
  assert.equal(
    wrappedTail(year({ archetype: "Active trader", scoredDays: 61 })),
    "61 scored days as an active trader",
  );
});
