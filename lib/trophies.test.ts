import assert from "node:assert/strict";
import { test } from "node:test";
import { archetypeStandings, trophiesFrom, TROPHY_GROUPS } from "./trophies";
import type { TrophyFacts } from "./trophies";
import type { ScoredDay } from "./score/shape";
import type { RoundTrip } from "./score/types";

function day(partial: Partial<ScoredDay> & { date: string }): ScoredDay {
  return {
    score: 80,
    components: { adherence: 80, consistency: 80, patience: 80, exposure: 80 },
    contributors: [],
    ...partial,
  };
}

function trip(partial: Partial<RoundTrip> = {}): RoundTrip {
  return {
    symbol: "VOO",
    openDate: "2026-01-02",
    closeDate: "2026-03-02",
    holdDays: 59,
    pnl: 120,
    notional: 4000,
    ...partial,
  };
}

const empty: TrophyFacts = { days: [], roundTrips: [], holdings: 0 };

/** A run of consecutive dates, so streak arithmetic has something to walk. */
function run(n: number, shape: (i: number) => Partial<ScoredDay> = () => ({})): ScoredDay[] {
  return Array.from({ length: n }, (_, i) =>
    day({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, ...shape(i) }),
  );
}

test("an empty account earns nothing and invents nothing", () => {
  const trophies = trophiesFrom(empty);
  assert.ok(trophies.length >= 12);
  assert.equal(trophies.filter((t) => t.earned).length, 0);
  for (const trophy of trophies) {
    assert.ok(trophy.requires.length > 0, `${trophy.key} states no condition`);
    if (trophy.progress) assert.equal(trophy.progress.have, 0);
  }
});

test("a single event carries no progress pair", () => {
  const trophies = trophiesFrom(empty);
  const single = trophies.find((t) => t.key === "recorder-live");
  assert.equal(single?.progress, null, "0 of 1 says less than the condition does");
});

test("progress is a real count and never runs past its own bar", () => {
  const trophies = trophiesFrom({ ...empty, days: run(12) });
  const ten = trophies.find((t) => t.key === "nights-10");
  const fifty = trophies.find((t) => t.key === "nights-50");
  assert.equal(ten?.earned, true);
  assert.deepEqual(ten?.progress, { have: 10, need: 10 }, "an earned bar reads full, never 12 of 10");
  assert.deepEqual(fifty?.progress, { have: 12, need: 50 });
});

test("a streak trophy reads the longest run ever, not the live one", () => {
  /* Fifteen clean days, then one that breaks every run, then nothing. */
  const days = [...run(15), day({ date: "2026-01-16", score: 20, components: { adherence: 20, consistency: 20, patience: 20, exposure: 20 } })];
  const trophies = trophiesFrom({ ...empty, days });
  assert.equal(trophies.find((t) => t.key === "streak-rules-5")?.earned, true);
  assert.equal(trophies.find((t) => t.key === "streak-rules-15")?.earned, true);
  assert.equal(trophies.find((t) => t.key === "streak-rules-40")?.earned, false);
});

test("the ledger trophies read the ledger", () => {
  const trophies = trophiesFrom({
    days: [],
    roundTrips: [trip(), trip({ holdDays: 400 })],
    holdings: 11,
  });
  assert.equal(trophies.find((t) => t.key === "first-close")?.earned, true);
  assert.equal(trophies.find((t) => t.key === "held-a-year")?.earned, true);
  assert.equal(trophies.find((t) => t.key === "ten-names")?.earned, true);
  assert.equal(trophies.find((t) => t.key === "trips-25")?.earned, false);
});

test("every trophy belongs to a declared group", () => {
  const groups = new Set(TROPHY_GROUPS.map((g) => g.key));
  for (const trophy of trophiesFrom(empty)) {
    assert.ok(groups.has(trophy.group), `${trophy.key} is in no group`);
  }
});

test("keys are unique — a duplicate would render twice and count twice", () => {
  const keys = trophiesFrom(empty).map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("the sixteen come back whole, with nothing inhabited on an empty history", () => {
  const standings = archetypeStandings([]);
  assert.equal(standings.length, 16);
  assert.ok(standings.every((s) => s.days === 0 && s.firstOn === null));
});

test("an inhabited archetype counts its nights and keeps the earliest", () => {
  const standings = archetypeStandings([
    day({ date: "2026-03-04" }),
    day({ date: "2026-01-09" }),
    day({
      date: "2026-02-02",
      components: { adherence: 10, consistency: 10, patience: 10, exposure: 10 },
    }),
  ]);
  const lit = standings.filter((s) => s.days > 0);
  assert.equal(lit.length, 2, "two distinct profiles, two archetypes");
  const strong = standings.find((s) => s.days === 2);
  assert.equal(strong?.firstOn, "2026-01-09", "the earliest night, whatever order they arrived in");
});
