import { adherence, consistency, exposure, patience } from "./components";
import { buildRoundTrips } from "./fifo";
import type { Contributor, ScoreInput, ScoreResult } from "./types";
import { clamp } from "./util";

/**
 * How much each component is worth when all four are measured.
 *
 * The weights are renormalised over whatever *is* measured, so a score built
 * from two components is still on a 0–100 scale and still weights the two in
 * their original proportion to each other. What it is not is a score built
 * from two real readings and two invented ones.
 */
const WEIGHTS = { consistency: 0.3, patience: 0.3, exposure: 0.2, adherence: 0.2 } as const;

/**
 * The minimum number of components a score may be built from.
 *
 * Two, not one. One component renormalised to full weight is that component
 * wearing the word "score", and the four exist because no one of them is the
 * reading on its own. Below the floor there is no score at all and the night
 * is not stored — which the dashboard already knows how to handle, because
 * `view.read` has always been null until a score lands.
 */
const MIN_MEASURED = 2;

/**
 * Health — one number, decomposed, **built only from what the ledger proved.**
 *
 * Weights: consistency .3, patience .3, adherence .2, exposure .2, renormalised
 * over the measured ones. Every input is windowed over 4–12 weeks, so the score
 * is slow-moving by construction: if a user could spike it in a day, we built
 * the wrong number.
 *
 * **Null is a real answer here.** Each component used to fall back to a neutral
 * figure when it had no evidence, and the arithmetic could not tell the
 * difference — so an account that connected, held eight positions and traded
 * nothing scored 76, was told all four components sat above the bar, and was
 * given an archetype. Every one of those four numbers was a constant in this
 * repository. Now a component with no evidence is absent, a score needs at
 * least two of them, and an account below the floor is simply not scored yet.
 */
export function computeScore(input: ScoreInput): ScoreResult | null {
  const trips = buildRoundTrips(input.transactions);

  const cons = consistency(input.transactions, input.date);
  const pat = patience(trips, input.baseline, input.date);
  const exp = exposure(input.transactions, input.baseline, input.date);
  const adh = adherence(input.transactions, trips, input.date);

  const parts: Array<[number | null, number]> = [
    [cons.score, WEIGHTS.consistency],
    [pat.score, WEIGHTS.patience],
    [exp.score, WEIGHTS.exposure],
    [adh.score, WEIGHTS.adherence],
  ];

  const measuredParts = parts.filter((p): p is [number, number] => p[0] != null);
  if (measuredParts.length < MIN_MEASURED) return null;

  const weight = measuredParts.reduce((sum, [, w]) => sum + w, 0);
  const score = clamp(
    Math.round(measuredParts.reduce((sum, [v, w]) => sum + v * w, 0) / weight),
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
    measured: measuredParts.length,
  };
}

/**
 * Why a component has no reading, for a screen that wants to say so.
 *
 * The scorer throws these away — a stored night keeps the figures and not the
 * reasons — so a surface that wants to explain an empty arc recomputes them
 * from the same ledger it already has in hand.
 */
export function componentReasons(input: ScoreInput): Record<keyof ScoreResult["components"], string | null> {
  const trips = buildRoundTrips(input.transactions);
  const cons = consistency(input.transactions, input.date);
  const pat = patience(trips, input.baseline, input.date);
  const exp = exposure(input.transactions, input.baseline, input.date);
  const adh = adherence(input.transactions, trips, input.date);
  return {
    consistency: cons.score == null ? (cons.why ?? "Not measured yet") : null,
    patience: pat.score == null ? (pat.why ?? "Not measured yet") : null,
    exposure: exp.score == null ? (exp.why ?? "Not measured yet") : null,
    adherence: adh.score == null ? (adh.why ?? "Not measured yet") : null,
  };
}
