import type { Contributor, ScoreComponents } from "./types";

/** Mirrors the idiom layer's DayState — kept structural, no UI import. */
export type DayShape = "kept" | "partial" | "exposed" | "empty";

/** The minimum a scored day needs to expose for shaping. */
export interface ScoredDay {
  date: string;
  score: number;
  components: ScoreComponents;
  contributors: Contributor[];
}

/**
 * What a score means, stated once.
 *
 * These were duplicated: this file banded a day at 78/62/58 while the heat
 * grid banded it at 90/78/64, so the same Tuesday could be "inside your
 * rules" in the ring and a pale cell in the grid beside it — a disagreement a
 * reader can see and nobody can explain. There is one table now and every
 * surface reads it.
 *
 * `EXCEPTIONAL` exists only for the grid's top band: a four-level ramp needs
 * a fourth edge, and putting it here keeps it with the other three rather
 * than inventing it inside a chart.
 *
 * It was 90, and on a disciplined account that put nearly every cell in the
 * year grid at full strength — a hundred and eighty tiles of one colour, which
 * is a fill rather than a texture and is the failure `HeatGrid`'s own note
 * warns about. The top of a four-step ramp has to be *rare* or the ramp has
 * three usable steps and a background. 94 keeps the other three edges where
 * they were, so nothing else that reads this table moves.
 */
const EXCEPTIONAL = 94;
const KEPT = 78;
const PARTIAL = 62;
const EXPOSED = 58;

/** A scored day as one of four levels of a heat ramp. Never zero — an unscored
 *  day is the caller's empty cell, which is a different fact from a bad day. */
export function scoreBand(score: number): 1 | 2 | 3 | 4 {
  if (score >= EXCEPTIONAL) return 4;
  if (score >= KEPT) return 3;
  if (score >= PARTIAL) return 2;
  return 1;
}

function shapeOf(day: ScoredDay): DayShape {
  // Exposure running under its floor is the more interesting reading, so it
  // wins over the headline score.
  /*
   * A null exposure is not a low one. With nothing measured there is no
   * shape to report beyond what the headline score says.
   */
  if (day.components.exposure != null && day.components.exposure < EXPOSED) return "exposed";
  if (day.score >= KEPT) return "kept";
  if (day.score >= PARTIAL) return "partial";
  return "empty";
}

/**
 * A fixed-length run of trading days, oldest first, padded with empties so
 * the ring always draws a full quarter even early on.
 */
export function disciplineSegments(days: ScoredDay[], length = 63): DayShape[] {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date)).slice(-length);
  const shapes = ordered.map(shapeOf);
  return [...new Array<DayShape>(Math.max(0, length - shapes.length)).fill("empty"), ...shapes];
}

export interface Streak {
  name: string;
  days: number;
}

/**
 * Streaks currently at stake — only runs that are live today count, because
 * a broken streak is not at stake.
 */
export function activeStreaks(days: ScoredDay[]): Streak[] {
  const desc = [...days].sort((a, b) => b.date.localeCompare(a.date));
  if (desc.length === 0) return [];

  const streaks: Streak[] = [];

  let insideRules = 0;
  for (const day of desc) {
    if (day.score < PARTIAL) break;
    insideRules += 1;
  }
  if (insideRules >= 2) {
    streaks.push({ name: "days inside your rules", days: insideRules });
  }

  let noCostlyExit = 0;
  for (const day of desc) {
    if (day.contributors.some((c) => c.tone === "clay")) break;
    noCostlyExit += 1;
  }
  if (noCostlyExit >= 2) {
    streaks.push({ name: "days without a costly exit", days: noCostlyExit });
  }

  let steadyExposure = 0;
  for (const day of desc) {
    if (day.components.exposure == null || day.components.exposure < EXPOSED) break;
    steadyExposure += 1;
  }
  if (steadyExposure >= 3) {
    streaks.push({ name: "days inside your exposure band", days: steadyExposure });
  }

  return streaks.sort((a, b) => b.days - a.days).slice(0, 3);
}

/**
 * Where the person sits against everyone scored through the same window.
 * Until the segment leaderboards land there is no cohort, so this reads the
 * person's own distribution — stated as such wherever it is shown.
 */
export function selfPercentile(days: ScoredDay[], score: number): number | null {
  if (days.length < 5) return null;
  const below = days.filter((d) => d.score < score).length;
  return Math.round((below / days.length) * 100);
}

/** The three runs, named once so the live and the longest agree on what they are. */
export type StreakKind = "insideRules" | "noCostlyExit" | "steadyExposure";

/**
 * Whether a given day continues each kind of run.
 *
 * `activeStreaks` and `bestStreaks` ask the same three questions, and asking
 * them in two places is how a trophy comes to be awarded for a run the ring
 * beside it does not recognise. One predicate table, two readers.
 */
const CONTINUES: Record<StreakKind, (day: ScoredDay) => boolean> = {
  insideRules: (day) => day.score >= PARTIAL,
  noCostlyExit: (day) => !day.contributors.some((c) => c.tone === "clay"),
  /* Unmeasured breaks the run: a night nobody read is not a night inside the band. */
  steadyExposure: (day) => day.components.exposure != null && day.components.exposure >= EXPOSED,
};

/**
 * The longest run of each kind ever recorded, live or not.
 *
 * `activeStreaks` deliberately reports only what is at stake today, which is
 * the right reading for a hero — a broken streak is not at stake. A trophy is
 * the opposite fact: it is a thing that happened and cannot un-happen, so it
 * reads the whole history and keeps the best.
 *
 * Zero where nothing qualifies, never null: a run of no days is a number the
 * caller can compare, and every caller here is comparing against a threshold.
 */
export function bestStreaks(days: ScoredDay[]): Record<StreakKind, number> {
  const asc = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const best: Record<StreakKind, number> = {
    insideRules: 0,
    noCostlyExit: 0,
    steadyExposure: 0,
  };

  for (const kind of Object.keys(CONTINUES) as StreakKind[]) {
    let run = 0;
    for (const day of asc) {
      run = CONTINUES[kind](day) ? run + 1 : 0;
      if (run > best[kind]) best[kind] = run;
    }
  }

  return best;
}
