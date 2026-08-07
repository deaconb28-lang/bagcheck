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

const KEPT = 78;
const PARTIAL = 62;
const EXPOSED = 58;

function shapeOf(day: ScoredDay): DayShape {
  // Exposure running under its floor is the more interesting reading, so it
  // wins over the headline score.
  if (day.components.exposure < EXPOSED) return "exposed";
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
    if (day.components.exposure < EXPOSED) break;
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
