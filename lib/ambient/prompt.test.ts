import assert from "node:assert/strict";
import test from "node:test";
import { CONSTRAINTS, FIELDS, promptFor } from "./prompt";

test("every field has a distinct key and a real size", () => {
  const keys = new Set(FIELDS.map((f) => f.key));
  assert.equal(keys.size, FIELDS.length);
  for (const field of FIELDS) {
    assert.ok(field.width > 0 && field.height > 0, field.key);
  }
});

test("the brief leads with the medium, not the colour", () => {
  const prompt = promptFor(FIELDS[0]);
  assert.ok(prompt.startsWith("Extremely soft volumetric light"));
});

test("every brief carries the whole prohibition list", () => {
  for (const field of FIELDS) {
    assert.ok(promptFor(field).includes(CONSTRAINTS), field.key);
  }
});

/*
 * The one rule that matters most. A model that draws a numeral has drawn a
 * figure nobody can correct, on a product whose entire claim is that its
 * numbers came off a brokerage.
 */
test("nothing may be drawn that a reader could mistake for a figure", () => {
  for (const word of ["numerals", "letters", "logos", "people", "objects"]) {
    assert.ok(CONSTRAINTS.includes(word), word);
  }
});

test("each field states where its composition must stay quiet", () => {
  for (const field of FIELDS) {
    assert.ok(field.quiet.length > 20, field.key);
    assert.ok(promptFor(field).includes(field.quiet), field.key);
  }
});
