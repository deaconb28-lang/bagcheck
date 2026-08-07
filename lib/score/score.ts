import { adherence, consistency, exposure, patience } from "./components";
import { buildRoundTrips } from "./fifo";
import type { Contributor, ScoreInput, ScoreResult } from "./types";
import { clamp } from "./util";

/**
 * Discipline — one number, decomposed. Weights: consistency .3,
 * patience .3, adherence .2, exposure .2. Every input is windowed over
 * 4–12 weeks, so the score is slow-moving by construction: if a user
 * could spike it in a day, we built the wrong number.
 */
export function computeScore(input: ScoreInput): ScoreResult {
  const trips = buildRoundTrips(input.transactions);

  const cons = consistency(input.transactions, input.date);
  const pat = patience(trips, input.baseline, input.date);
  const exp = exposure(input.transactions, input.baseline, input.date);
  const adh = adherence(input.transactions, trips, input.date);

  const score = clamp(
    Math.round(0.3 * cons.score + 0.3 * pat.score + 0.2 * exp.score + 0.2 * adh.score),
    0,
    100,
  );

  const contributors: Contributor[] = [...cons.signals, ...pat.signals, ...exp.signals, ...adh.signals]
    .filter((signal) => signal.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 4);

  return {
    date: input.date,
    baseline: input.baseline,
    score,
    components: {
      adherence: adh.score,
      consistency: cons.score,
      patience: pat.score,
      exposure: exp.score,
    },
    contributors,
  };
}
