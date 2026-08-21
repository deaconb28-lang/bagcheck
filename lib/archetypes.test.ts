import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ARCHETYPES,
  STRONG,
  archetypeByKey,
  archetypeFor,
  archetypeIndex,
  strongLine,
} from "./archetypes";
import type { ScoreComponents } from "@/lib/score";

const at = (a: number, c: number, p: number, e: number): ScoreComponents => ({
  adherence: a,
  consistency: c,
  patience: p,
  exposure: e,
});

test("there are exactly sixteen, one per corner of the cube", () => {
  assert.equal(ARCHETYPES.length, 16);
});

test("every row sits at the index its own strong list implies", () => {
  const bit: Record<string, number> = { adherence: 8, consistency: 4, patience: 2, exposure: 1 };
  ARCHETYPES.forEach((archetype, index) => {
    const implied = archetype.strong.reduce((sum, key) => sum + bit[key], 0);
    assert.equal(implied, index, `${archetype.name} is in the wrong row`);
  });
});

test("keys and names are unique — an avatar asset is keyed on the slug", () => {
  assert.equal(new Set(ARCHETYPES.map((a) => a.key)).size, 16);
  assert.equal(new Set(ARCHETYPES.map((a) => a.name)).size, 16);
  assert.equal(new Set(ARCHETYPES.map((a) => a.emblem)).size, 16);
});

test("every possible profile lands somewhere, and only somewhere", () => {
  const seen = new Set<string>();
  for (const a of [0, 100]) {
    for (const c of [0, 100]) {
      for (const p of [0, 100]) {
        for (const e of [0, 100]) {
          seen.add(archetypeFor(at(a, c, p, e))!.key);
        }
      }
    }
  }
  assert.equal(seen.size, 16);
});

test("the bar is exact — at STRONG a component counts, one below it does not", () => {
  assert.equal(archetypeFor(at(STRONG, 0, 0, 0))?.key, "measured");
  assert.equal(archetypeFor(at(STRONG - 1, 0, 0, 0))?.key, "improviser");
});

test("the bar is fixed, not relative to the reader's own mean", () => {
  // Both profiles have adherence as their strongest component. Only the one
  // that actually clears the bar is The Measured — a relative bar would put
  // both here, and the badge would stop meaning anything.
  assert.equal(archetypeFor(at(72, 30, 30, 30))?.key, "measured");
  assert.equal(archetypeFor(at(40, 20, 20, 20))?.key, "improviser");
});

test("no profile is no archetype — never The Improviser by default", () => {
  /*
   * This used to answer "improviser" for a missing profile, which reads as a
   * finding rather than as a gap: The Improviser means the ledger measured
   * four components and none cleared the bar. An account that has measured
   * nothing has not earned that sentence about itself.
   */
  assert.equal(archetypeFor(null), null);
  assert.equal(archetypeIndex(null), null);
});

test("an incomplete profile has no corner of the cube", () => {
  const partial = { adherence: 80, consistency: 80, patience: null, exposure: null };
  assert.equal(archetypeFor(partial), null);
  assert.equal(archetypeIndex(partial), null);
});

test("lookup by key round-trips, and an unknown key is null not a guess", () => {
  for (const archetype of ARCHETYPES) {
    assert.equal(archetypeByKey(archetype.key)?.name, archetype.name);
  }
  assert.equal(archetypeByKey("the-legend"), null);
});

test("the strong line names the components, never a benchmark", () => {
  assert.equal(strongLine(archetypeFor(at(80, 80, 20, 20))!), "adherence · consistency above 60");
  assert.equal(strongLine(archetypeFor(at(10, 10, 10, 10))!), "Nothing above 60 yet");
});

test("no archetype line coaches, grades or exclaims", () => {
  for (const { name, line } of ARCHETYPES) {
    assert.ok(!line.includes("!"), name);
    assert.ok(
      !/\b(you should|consider|try|improve|better|worse|good|bad|great)\b/i.test(line),
      `${name}: ${line}`,
    );
    assert.ok(line.endsWith("."), name);
  }
});
