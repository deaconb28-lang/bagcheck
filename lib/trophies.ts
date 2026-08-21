import { ARCHETYPES, STRONG, archetypeFor } from "@/lib/archetypes";
import { bestStreaks, scoreBand, type ScoredDay } from "@/lib/score/shape";
import { COMPONENT_KEYS } from "@/lib/score/types";
import type { RoundTrip } from "@/lib/score/types";

/**
 * ── The trophy case ──
 *
 * Everything on `/trophies` is a fact the ledger has already proved, restated
 * as a thing that happened. Nothing here is new arithmetic and nothing here is
 * a projection: `bestStreaks` reads scored days, `scoreBand` is the same four
 * edges every other surface bands on, and the round trips come off the derived
 * document the dashboard already loaded.
 *
 * Two rules, and they are the same two the rest of the product runs on.
 *
 * **A locked trophy states a real count or no count at all.** "38 tags to go"
 * is honest because it is a subtraction of two things on file; "you're 80%
 * of the way there" is a projection wearing a percentage. So every entry
 * declares a `need` and a `have` read straight off the facts, and the surface
 * shows the pair or shows nothing.
 *
 * **The condition reads the same whether it is earned or not.** A locked row
 * saying "five scored days in a row inside your rules" and an earned row
 * saying "unlocked" would hide what the thing actually was the moment you got
 * it — which is exactly when somebody wants to tell another person about it.
 */

export type TrophyGroup = "streak" | "record" | "ledger";

/**
 * The drawn readout a trophy wears, from `components/cards/Teaser.tsx`.
 *
 * Named as a string rather than imported as its union, because this module is
 * pure and has no business reaching into the component layer. The surface
 * casts it, and a name with no drawing behind it fails there loudly.
 */
export interface Trophy {
  key: string;
  group: TrophyGroup;
  name: string;
  /** What earns it. Stated identically on an earned row and a locked one. */
  requires: string;
  teaser: string;
  earned: boolean;
  /**
   * Real counts, both sides off the ledger. `null` where the trophy is a
   * single event — "0 of 1" is a worse sentence than the condition itself.
   */
  progress: { have: number; need: number } | null;
}

export interface TrophyFacts {
  days: ScoredDay[];
  roundTrips: RoundTrip[];
  /** Names held in the most recent snapshot. */
  holdings: number;
}

interface Entry {
  key: string;
  group: TrophyGroup;
  name: string;
  requires: string;
  teaser: string;
  need: number;
  have: (facts: TrophyFacts, best: Record<string, number>) => number;
}

/*
 * The roster. Sixteen, in the order they are most likely to be earned, so a
 * fresh account reads down its own near future rather than hunting for the
 * one row it can reach.
 */
const ENTRIES: Entry[] = [
  {
    key: "recorder-live",
    group: "record",
    name: "Recorder live",
    requires: "One scored night on file",
    teaser: "ring",
    need: 1,
    have: (f) => f.days.length,
  },
  {
    key: "first-close",
    group: "ledger",
    name: "First position closed",
    requires: "One position opened and closed",
    teaser: "hold",
    need: 1,
    have: (f) => f.roundTrips.length,
  },
  {
    key: "kept-day",
    group: "record",
    name: "A day inside your rules",
    requires: "One night scored 78 or better",
    teaser: "components",
    need: 1,
    have: (f) => f.days.filter((d) => scoreBand(d.score) >= 3).length,
  },
  {
    key: "streak-rules-5",
    group: "streak",
    name: "Five in a row",
    requires: "Five scored nights in a row, inside your rules",
    teaser: "streak",
    need: 5,
    have: (_f, best) => best.insideRules,
  },
  {
    key: "nights-10",
    group: "record",
    name: "Ten nights recorded",
    requires: "Ten scored nights on file",
    teaser: "records",
    need: 10,
    have: (f) => f.days.length,
  },
  {
    key: "ten-names",
    group: "ledger",
    name: "Ten names at once",
    requires: "Ten positions in a single snapshot",
    teaser: "eventWindow",
    need: 10,
    have: (f) => f.holdings,
  },
  {
    key: "streak-exit-10",
    group: "streak",
    name: "Ten days, no costly exit",
    requires: "Ten nights in a row with nothing sold against you",
    teaser: "exitSpeed",
    need: 10,
    have: (_f, best) => best.noCostlyExit,
  },
  {
    key: "trips-25",
    group: "ledger",
    name: "Twenty-five round trips",
    requires: "Twenty-five positions round-tripped",
    teaser: "ledger",
    need: 25,
    have: (f) => f.roundTrips.length,
  },
  {
    key: "streak-band-20",
    group: "streak",
    name: "Twenty days in band",
    requires: "Twenty nights in a row inside your exposure band",
    teaser: "conviction",
    need: 20,
    have: (_f, best) => best.steadyExposure,
  },
  {
    key: "streak-rules-15",
    group: "streak",
    name: "Fifteen in a row",
    requires: "Fifteen scored nights in a row, inside your rules",
    teaser: "cadence",
    need: 15,
    have: (_f, best) => best.insideRules,
  },
  {
    key: "nights-50",
    group: "record",
    name: "Fifty nights recorded",
    requires: "Fifty scored nights on file",
    teaser: "digest",
    need: 50,
    have: (f) => f.days.length,
  },
  {
    key: "exceptional-day",
    group: "record",
    name: "An exceptional day",
    requires: "One night scored 94 or better",
    teaser: "percentile",
    need: 1,
    have: (f) => f.days.filter((d) => scoreBand(d.score) === 4).length,
  },
  {
    key: "held-a-year",
    group: "ledger",
    name: "Held a name a year",
    requires: "One position held a full year",
    teaser: "stamp",
    need: 1,
    have: (f) => f.roundTrips.filter((t) => t.holdDays >= 365).length,
  },
  {
    key: "streak-rules-40",
    group: "streak",
    name: "Forty in a row",
    requires: "Forty scored nights in a row, inside your rules",
    teaser: "months",
    need: 40,
    have: (_f, best) => best.insideRules,
  },
  {
    key: "trips-100",
    group: "ledger",
    name: "A hundred round trips",
    requires: "A hundred positions round-tripped",
    teaser: "sessionSize",
    need: 100,
    have: (f) => f.roundTrips.length,
  },
  {
    key: "nights-200",
    group: "record",
    name: "Two hundred nights recorded",
    requires: "Two hundred scored nights on file",
    teaser: "equity",
    need: 200,
    have: (f) => f.days.length,
  },
  /*
   * A night where the ledger could measure all four components at once.
   *
   * This one only became possible to earn — or to fail — when a component
   * with no evidence started returning null instead of a neutral figure. It
   * is the honest version of "a complete reading", and on a quiet account it
   * is genuinely hard.
   */
  {
    key: "full-reading",
    group: "record",
    name: "A complete reading",
    requires: "One night with all four components measured",
    teaser: "components",
    need: 1,
    have: (f) => f.days.filter((d) => COMPONENT_KEYS.every((k) => d.components[k] != null)).length,
  },
  {
    key: "all-above",
    group: "record",
    name: "All four above the bar",
    requires: `One night with all four components over ${STRONG}`,
    teaser: "ring",
    need: 1,
    have: (f) =>
      f.days.filter((d) => COMPONENT_KEYS.every((k) => (d.components[k] ?? -1) >= STRONG)).length,
  },
  {
    key: "five-names",
    group: "ledger",
    name: "Five names at once",
    requires: "Five positions in a single snapshot",
    teaser: "cardFan",
    need: 5,
    have: (f) => f.holdings,
  },
  {
    key: "twenty-names",
    group: "ledger",
    name: "Twenty names at once",
    requires: "Twenty positions in a single snapshot",
    teaser: "hours",
    need: 20,
    have: (f) => f.holdings,
  },
  {
    key: "held-six-months",
    group: "ledger",
    name: "Held a name half a year",
    requires: "One position held a hundred and eighty days",
    teaser: "cadence",
    need: 1,
    have: (f) => f.roundTrips.filter((t) => t.holdDays >= 180).length,
  },
  {
    key: "streak-exit-25",
    group: "streak",
    name: "Twenty-five days, no costly exit",
    requires: "Twenty-five nights in a row with nothing sold against you",
    teaser: "records",
    need: 25,
    have: (_f, best) => best.noCostlyExit,
  },
];

export function trophiesFrom(facts: TrophyFacts): Trophy[] {
  const best = bestStreaks(facts.days);
  return ENTRIES.map((entry) => {
    const have = entry.have(facts, best);
    return {
      key: entry.key,
      group: entry.group,
      name: entry.name,
      requires: entry.requires,
      teaser: entry.teaser,
      earned: have >= entry.need,
      /*
       * A single-event trophy carries no pair. "0 of 1" says less than the
       * condition already says, and "1 of 1" beside an earned row is noise.
       */
      progress: entry.need > 1 ? { have: Math.min(have, entry.need), need: entry.need } : null,
    };
  });
}

/** How each group is titled and what it is about. Stated once. */
export const TROPHY_GROUPS: Array<{ key: TrophyGroup; title: string; note: string }> = [
  { key: "streak", title: "Streaks", note: "The longest run of each kind, live or long finished." },
  { key: "record", title: "The record", note: "What the recorder has written down about you." },
  { key: "ledger", title: "The ledger", note: "What your brokerage says you actually did." },
];

/**
 * ── The sixteen ──
 *
 * An archetype is computed from a day's four components, so every scored day
 * on file has one. Read across the history that is a collection: which of the
 * sixteen this account has actually been, and when it first was.
 *
 * It is a genuine set rather than a scoreboard — no archetype is better than
 * another, and the count beside each is how many nights read that way, never
 * a rank. All sixteen are returned in the table's own order so the shape of
 * the cube stays visible; an archetype never inhabited comes back at zero.
 */
export interface ArchetypeStanding {
  key: string;
  name: string;
  line: string;
  days: number;
  firstOn: string | null;
}

export function archetypeStandings(days: ScoredDay[]): ArchetypeStanding[] {
  const seen = new Map<string, { days: number; firstOn: string }>();
  for (const day of days) {
    /* A night with an incomplete profile has no corner and is not counted. */
    const archetype = archetypeFor(day.components);
    if (!archetype) continue;
    const key = archetype.key;
    const found = seen.get(key);
    if (!found) seen.set(key, { days: 1, firstOn: day.date });
    else {
      found.days += 1;
      if (day.date < found.firstOn) found.firstOn = day.date;
    }
  }

  return ARCHETYPES.map((archetype) => {
    const found = seen.get(archetype.key);
    return {
      key: archetype.key,
      name: archetype.name,
      line: archetype.line,
      days: found?.days ?? 0,
      firstOn: found?.firstOn ?? null,
    };
  });
}

/**
 * The three the account is closest to, so a reader can see what is next.
 *
 * Ranked by how far along a trophy actually is, which is only knowable for the
 * ones with a real count on both sides — a single-event trophy is either done
 * or it is not, and slotting it at "0%" would push genuinely close things off
 * a list whose whole point is closeness. Those come last, in roster order,
 * only if there is room.
 */
export function nextUp(trophies: Trophy[], count = 3): Trophy[] {
  const open = trophies.filter((t) => !t.earned);
  const measurable = open
    .filter((t) => t.progress)
    .sort((a, b) => b.progress!.have / b.progress!.need - a.progress!.have / a.progress!.need);
  const single = open.filter((t) => !t.progress);
  return [...measurable, ...single].slice(0, count);
}
