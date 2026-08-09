import assert from "node:assert/strict";
import { test } from "node:test";
import { AGE_CEIL, AGE_FLOOR, investorAge } from "./age";

const at = (patience: number, adherence = 50, consistency = 50) => ({
  components: { adherence, consistency, patience, exposure: 50 },
  winnersMeanHold: 60,
  scoredDays: 120,
});

test("no evidence, no age — never a default one", () => {
  assert.equal(investorAge({ components: null, winnersMeanHold: 400, scoredDays: 900 }), null);
});

test("bounded to a human span whatever the inputs do", () => {
  const wild = investorAge({
    components: { adherence: 100, consistency: 100, patience: 100, exposure: 100 },
    winnersMeanHold: 10_000,
    scoredDays: 10_000,
  });
  assert.ok(wild !== null && wild <= AGE_CEIL);
  const raw = investorAge({
    components: { adherence: 0, consistency: 0, patience: 0, exposure: 0 },
    winnersMeanHold: 0,
    scoredDays: 0,
  });
  assert.equal(raw, AGE_FLOOR);
});

test("patience ages you monotonically", () => {
  const ages = [0, 25, 50, 75, 100].map((p) => investorAge(at(p))!);
  for (let i = 1; i < ages.length; i += 1) assert.ok(ages[i] >= ages[i - 1]);
  assert.ok(ages[4] > ages[0]);
});

test("exposure moves nothing — running hot is a style, not an age", () => {
  const cool = investorAge({ ...at(60), components: { ...at(60).components, exposure: 5 } });
  const hot = investorAge({ ...at(60), components: { ...at(60).components, exposure: 95 } });
  assert.equal(cool, hot);
});

test("the archetypes land where the story says they land", () => {
  // A fresh chaser reads barely older than the floor…
  const chaser = investorAge({
    components: { adherence: 20, consistency: 25, patience: 10, exposure: 80 },
    winnersMeanHold: 4,
    scoredDays: 30,
  })!;
  assert.ok(chaser <= 28, String(chaser));
  // …and a monk with a year of evidence reads late-career.
  const monk = investorAge({
    components: { adherence: 90, consistency: 85, patience: 95, exposure: 40 },
    winnersMeanHold: 320,
    scoredDays: 250,
  })!;
  assert.ok(monk >= 60, String(monk));
});

test("missing hold data is treated as none, not as an error", () => {
  assert.ok(investorAge({ ...at(50), winnersMeanHold: null }) !== null);
});
