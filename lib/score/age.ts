import type { ScoreComponents } from "./types";

/**
 * Investor Age — the header stat.
 *
 * The Whoop-Age move for money: your *behaviour* mapped onto the arc of an
 * investing life. An eighteen-year-old account chases; a sixty-year-old one
 * sits still. The number answers "how old does your conduct look?", which is
 * a different — and more shareable — question than "how good is it?".
 *
 * Honest by construction:
 * - **Deterministic and documented.** A weighted read of the same four score
 *   components the product already stands on, plus how long winners are held
 *   and how much evidence exists. No model, no noise, no flattery curve.
 * - **Monotonic.** More patience can only age you; a panic-shaped profile can
 *   only stay young. Tested.
 * - **Bounded 18–72.** Nobody is a 9-year-old or a 140-year-old investor;
 *   outside the band the joke dies and takes the credibility with it.
 * - **Exposure is deliberately absent.** Running hot is a style, not an age —
 *   a disciplined day trader should be able to read old.
 *
 * Null when there is no scored day yet: with no evidence there is no age,
 * not a default one.
 */

export const AGE_FLOOR = 18;
export const AGE_CEIL = 72;

/** Weights, stated once. Patience is the spine of the metric on purpose. */
const W = {
  patience: 22,
  adherence: 12,
  consistency: 8,
  /** Mean winner hold, saturating at a year. */
  hold: 8,
  /** Tenure of evidence — scored days, saturating at a trading year. */
  tenure: 4,
} as const;

export interface AgeInput {
  components: ScoreComponents | null;
  /** Mean hold of winning round trips, in days. Null when too few exist. */
  winnersMeanHold: number | null;
  scoredDays: number;
}

export function investorAge(input: AgeInput): number | null {
  const c = input.components;
  if (!c) return null;
  /*
   * Age is read off three of the four components, so it needs all three. It
   * used to take whatever number was there, which after the neutral defaults
   * meant it was reading three constants and reporting a confident age for an
   * account that had proved nothing.
   */
  if (c.patience == null || c.adherence == null || c.consistency == null) return null;

  const unit = (n: number) => Math.max(0, Math.min(1, n));
  const years =
    AGE_FLOOR +
    unit(c.patience / 100) * W.patience +
    unit(c.adherence / 100) * W.adherence +
    unit(c.consistency / 100) * W.consistency +
    unit((input.winnersMeanHold ?? 0) / 365) * W.hold +
    unit(input.scoredDays / 260) * W.tenure;

  return Math.min(AGE_CEIL, Math.round(years));
}
