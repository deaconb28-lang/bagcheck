import assert from "node:assert/strict";
import { test } from "node:test";
import { ARCHETYPES } from "@/lib/archetypes";
import { avatarPrompt } from "./prompt";
import { AVATAR_KEYS, emblemBody } from "./drawn";

test("every archetype asks for its own emblem, and no two prompts match", () => {
  const prompts = ARCHETYPES.map(avatarPrompt);
  assert.equal(new Set(prompts).size, 16);
  ARCHETYPES.forEach((archetype, i) => {
    assert.ok(prompts[i].includes(archetype.emblem), archetype.name);
  });
});

test("the prompt forbids everything that would break the system", () => {
  const prompt = avatarPrompt(ARCHETYPES[0]);
  for (const banned of ["No text", "No logos", "No people", "no gloss"]) {
    assert.ok(prompt.includes(banned), banned);
  }
});

test("the prompt never names the archetype, only its form", () => {
  // A model given the word "Sentinel" draws a guard. The emblem table is the
  // whole brief on purpose.
  for (const archetype of ARCHETYPES) {
    const prompt = avatarPrompt(archetype);
    assert.ok(!prompt.includes(archetype.name), archetype.name);
  }
});

test("all sixteen emblems are drawn, and all sixteen are different", () => {
  const bodies = AVATAR_KEYS.map(emblemBody);
  assert.equal(bodies.length, 16);
  assert.equal(new Set(bodies).size, 16);
  assert.ok(bodies.every((b) => b.includes("<path") || b.includes("<circle")));
});

test("an unknown key still draws something rather than nothing", () => {
  assert.equal(emblemBody("not-an-archetype"), emblemBody("improviser"));
});
