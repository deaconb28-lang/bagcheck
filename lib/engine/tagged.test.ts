import assert from "node:assert/strict";
import test from "node:test";
import type { RoundTrip } from "@/lib/score";
import type { TaggedOpen } from "./tagged";
import { byConviction, byReason, revenge, whatTagsAreMissing } from "./tagged";

const trip = (o: Partial<RoundTrip> = {}): RoundTrip => ({
  symbol: "AAA",
  openDate: "2026-01-05",
  closeDate: "2026-01-20",
  holdDays: 15,
  pnl: 100,
  notional: 1000,
  ...o,
});

const open = (o: Partial<TaggedOpen> = {}): TaggedOpen => ({
  symbol: "AAA",
  date: "2026-01-05",
  why: "thesis",
  conviction: 3,
  ...o,
});

/** n trips of one symbol-per-index shape, with a matching tagged open. */
const tagged = (
  n: number,
  overrides: (i: number) => { trip?: Partial<RoundTrip>; open?: Partial<TaggedOpen> },
): { trips: RoundTrip[]; opens: TaggedOpen[] } => {
  const trips: RoundTrip[] = [];
  const opens: TaggedOpen[] = [];
  for (let i = 0; i < n; i += 1) {
    const { trip: t = {}, open: o = {} } = overrides(i);
    const symbol = `S${i}`;
    trips.push(trip({ symbol, ...t }));
    opens.push(open({ symbol, ...o }));
  }
  return { trips, opens };
};

test("conviction reports the clean multiple when both sides made money", () => {
  const { trips, opens } = tagged(20, (i) => ({
    trip: { pnl: i < 10 ? 80 : 20 },
    open: { conviction: i < 10 ? 5 : 2 },
  }));
  const f = byConviction(trips, opens);
  assert.ok(f, "expected a finding");
  assert.match(f.sentence, /4\.0× your low-conviction/);
  assert.equal(f.tone, "moss");
});

test("conviction goes quiet below the sample floor", () => {
  const { trips, opens } = tagged(10, (i) => ({
    trip: { pnl: 80 },
    open: { conviction: i < 5 ? 5 : 2 }, // five per side — under the floor
  }));
  assert.equal(byConviction(trips, opens), null);
});

test("an inverted conviction gradient is named, not hidden", () => {
  const { trips, opens } = tagged(20, (i) => ({
    trip: { pnl: i < 10 ? -50 : 60 },
    open: { conviction: i < 10 ? 5 : 1 },
  }));
  const f = byConviction(trips, opens);
  assert.ok(f);
  assert.match(f.sentence, /low-conviction entries have outperformed/);
  assert.equal(f.tone, "clay"); // high side lost money
});

test("reason findings wait for the promised kind floor", () => {
  const { trips, opens } = tagged(20, (i) => ({
    trip: { pnl: i < 10 ? 90 : -60 },
    open: { why: i < 10 ? "thesis" : "momentum" },
  }));
  // Ten of each closed, but only a few tags of each kind on file overall.
  assert.equal(byReason(trips, opens, { thesis: 10, momentum: 10 }), null);
  const f = byReason(trips, opens, { thesis: 30, momentum: 31 });
  assert.ok(f, "expected a finding once both kinds cleared the floor");
  assert.match(f.sentence, /"thesis" returned \+9\.0%/);
  assert.match(f.sentence, /"momentum" returned −6\.0%/);
  assert.equal(f.tone, "clay");
});

test("revenge is named alone, and only when it lost money", () => {
  const losing = tagged(10, () => ({ trip: { pnl: -45 }, open: { why: "revenge" } }));
  const f = revenge(losing.trips, losing.opens, { revenge: 30 });
  assert.ok(f);
  assert.match(f.sentence, /tagged revenge returned −4\.5%/);
  assert.equal(f.tone, "clay");

  const winning = tagged(10, () => ({ trip: { pnl: 45 }, open: { why: "revenge" } }));
  assert.equal(winning.trips.length, 10);
  assert.equal(revenge(winning.trips, winning.opens, { revenge: 30 }), null);
  assert.equal(revenge(losing.trips, losing.opens, { revenge: 12 }), null, "below the kind floor");
});

test("the tag rail line reports where the data stands, then goes quiet", () => {
  assert.match(String(whatTagsAreMissing([], {})), /No entry carries a reason yet/);
  assert.match(String(whatTagsAreMissing([], { thesis: 12 })), /12 reasons are on file/);
  assert.equal(whatTagsAreMissing([], { thesis: 30 }), null);
});
