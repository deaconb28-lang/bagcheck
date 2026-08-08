import assert from "node:assert/strict";
import { test } from "node:test";
import { ARCHETYPES } from "@/lib/archetypes";
import { avatarHue, avatarPrompt } from "./prompt";
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
  for (const banned of ["no text, letters, numbers", "No logos", "No people", "No border"]) {
    assert.ok(prompt.includes(banned), banned);
  }
});

test("the hue carries the same reading the name does", () => {
  // More components above the bar burns brighter. The colour is not assigned
  // for variety — it is the archetype saying the same thing twice.
  const hueOf = (key: string) => avatarHue(ARCHETYPES.find((a) => a.key === key)!);
  assert.equal(hueOf("improviser"), "violet");
  assert.equal(hueOf("patient"), "azure");
  assert.equal(hueOf("anchor"), "moss");
  assert.equal(hueOf("composed"), "ember");
});

test("every prompt asks for exactly one light, and it is a named family", () => {
  for (const archetype of ARCHETYPES) {
    const prompt = avatarPrompt(archetype);
    const lights = ["#57D69D", "#FF9B45", "#62B0F5", "#B48BFF"].filter((h) => prompt.includes(h));
    assert.equal(lights.length, 1, archetype.name);
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
