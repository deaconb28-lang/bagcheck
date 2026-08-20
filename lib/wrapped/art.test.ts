import assert from "node:assert/strict";
import test from "node:test";
import { backgroundCards, promptFor } from "./backgrounds";

const cards = backgroundCards();

test("every card carries its own medium, texture and palette", () => {
  assert.equal(cards.length, 12);
  for (const card of cards) {
    assert.ok(card.art?.medium, `${card.no} has no medium`);
    assert.ok(card.art?.texture, `${card.no} has no texture`);
    assert.ok(card.art?.palette, `${card.no} has no palette`);
  }
});

test("no two cards share a medium, a palette or a motif", () => {
  /*
   * The whole point of the deck. Twelve cards on one art direction is one
   * card printed twelve times, which is what the shared STYLE_PREFIX produced.
   */
  for (const field of ["medium", "palette"] as const) {
    const seen = new Set(cards.map((c) => c.art[field]));
    assert.equal(seen.size, 12, `${field} repeats across the deck`);
  }
  assert.equal(new Set(cards.map((c) => c.motif)).size, 12);
});

test("the medium opens the prompt, because a model weights the front hardest", () => {
  for (const card of cards) {
    assert.ok(
      promptFor(card).startsWith(card.art.medium),
      `${card.no} does not lead with its medium`,
    );
  }
});

test("every prompt forbids the things that would break a card", () => {
  /*
   * Load-bearing rather than fussy: every figure on a Wrapped card is set in
   * type by us, and a numeral a model drew is one nobody can correct on an
   * artefact whose whole claim is that it came off a brokerage.
   */
  for (const card of cards) {
    const prompt = promptFor(card);
    for (const banned of ["no text", "numbers", "No logos", "no people"]) {
      assert.ok(
        prompt.toLowerCase().includes(banned.toLowerCase()),
        `${card.no} does not forbid ${banned}`,
      );
    }
    assert.match(prompt, /Vertical 2:3 portrait poster art/);
  }
});

test("the composition a card asks for is the negative of where its type sits", () => {
  /*
   * The two directions have to agree. A card whose lockup is at the head, told
   * to keep its lower third quiet, would come back with the incident drawn
   * straight through the type.
   */
  const wants: Record<string, RegExp> = {
    foot: /centre and the lower third/,
    head: /upper half visually quiet/,
    middle: /band across the centre/,
    split: /top edge and the lower half/,
  };
  for (const card of cards) {
    assert.match(promptFor(card), wants[card.place], `${card.no} (${card.place})`);
  }
  assert.equal(new Set(cards.map((c) => c.place)).size, 4, "the deck skips a placement");
});

test("a prompt names its own palette and subject", () => {
  const halftone = cards.find((c) => c.key === "best");
  assert.ok(halftone);
  const prompt = promptFor(halftone);
  assert.match(prompt, /halftone/i);
  assert.match(prompt, /canary yellow/);
  /* The subject moved to the flight world; the medium and palette did not. */
  assert.match(prompt, /shock diamond/);
});
