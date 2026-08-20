import { ARCHETYPES, archetypeFor } from "@/lib/archetypes";
import { bestStreaks, scoreBand, type ScoredDay } from "@/lib/score/shape";
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
    requires: "One nightly score on file",
    teaser: "ring",
    need: 1,
    have: (f) => f.days.length,
  },
  {
    key: "first-close",
    group: "ledger",
    name: "First position closed",
    requires: "One round trip on the ledger",
    teaser: "hold",
    need: 1,
    have: (f) => f.roundTrips.length,
  },
  {
    key: "kept-day",
    group: "record",
    name: "A day inside your rules",
    requires: "One scored day in the third band or better",
    teaser: "components",
    need: 1,
    have: (f) => f.days.filter((d) => scoreBand(d.score) >= 3).length,
  },
  {
    key: "streak-rules-5",
    group: "streak",
    name: "Five in a row",
    requires: "Five consecutive scored days inside your rules",
    teaser: "streak",
    need: 5,
    have: (_f, best) => best.insideRules,
  },
  {
    key: "nights-10",
    group: "record",
    name: "Ten nights recorded",
    requires: "Ten scored days on file",
    teaser: "records",
    need: 10,
    have: (f) => f.days.length,
  },
  {
    key: "ten-names",
    group: "ledger",
    name: "Ten names at once",
    requires: "Ten positions in one snapshot",
    teaser: "eventWindow",
    need: 10,
    have: (f) => f.holdings,
  },
  {
    key: "streak-exit-10",
    group: "streak",
    name: "Ten days, no costly exit",
    requires: "Ten consecutive scored days with nothing sold against you",
    teaser: "exitSpeed",
    need: 10,
    have: (_f, best) => best.noCostlyExit,
  },
  {
    key: "trips-25",
    group: "ledger",
    name: "Twenty-five round trips",
    requires: "Twenty-five positions opened and closed",
    teaser: "ledger",
    need: 25,
    have: (f) => f.roundTrips.length,
  },
  {
    key: "streak-band-20",
    group: "streak",
    name: "Twenty days in band",
    requires: "Twenty consecutive scored days inside your exposure band",
    teaser: "conviction",
    need: 20,
    have: (_f, best) => best.steadyExposure,
  },
  {
    key: "streak-rules-15",
    group: "streak",
    name: "Fifteen in a row",
    requires: "Fifteen consecutive scored days inside your rules",
    teaser: "cadence",
    need: 15,
    have: (_f, best) => best.insideRules,
  },
  {
    key: "nights-50",
    group: "record",
    name: "Fifty nights recorded",
    requires: "Fifty scored days on file",
    teaser: "digest",
    need: 50,
    have: (f) => f.days.length,
  },
  {
    key: "exceptional-day",
    group: "record",
    name: "An exceptional day",
    requires: "One scored day in the top band",
    teaser: "percentile",
    need: 1,
    have: (f) => f.days.filter((d) => scoreBand(d.score) === 4).length,
  },
  {
    key: "held-a-year",
    group: "ledger",
    name: "Held a name a year",
    requires: "One round trip held three hundred and sixty-five days",
    teaser: "stamp",
    need: 1,
    have: (f) => f.roundTrips.filter((t) => t.holdDays >= 365).length,
  },
  {
    key: "streak-rules-40",
    group: "streak",
    name: "Forty in a row",
    requires: "Forty consecutive scored days inside your rules",
    teaser: "months",
    need: 40,
    have: (_f, best) => best.insideRules,
  },
  {
    key: "trips-100",
    group: "ledger",
    name: "A hundred round trips",
    requires: "A hundred positions opened and closed",
    teaser: "sessionSize",
    need: 100,
    have: (f) => f.roundTrips.length,
  },
  {
    key: "nights-200",
    group: "record",
    name: "Two hundred nights recorded",
    requires: "Two hundred scored days on file",
    teaser: "equity",
    need: 200,
    have: (f) => f.days.length,
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
  { key: "record", title: "The record", note: "What the recorder has written down about the account." },
  { key: "ledger", title: "The ledger", note: "What the brokerage says the account actually did." },
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
    const key = archetypeFor(day.components).key;
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
