import type { CardKind } from "@/lib/cards/kinds";

/**
 * One scene per card kind.
 *
 * Twelve cards drawn on four backdrops looked like four cards printed three
 * times each — the eye reads the picture before the headline, so a repeated
 * picture reads as a repeated card. Each kind now gets a landscape chosen for
 * what the card is *about*, so the scene is carrying the same statement the
 * type is rather than decorating it.
 *
 * Pure, and separate from `artPrompt` so the mapping can be read as a table
 * and tested without spending anything.
 */
export const SCENE: Record<CardKind, string> = {
  /** Identity: one landform that is unmistakably itself. */
  archetype: "a single monolithic rock spire standing alone on an empty plain, seen from below",
  /** One number: a symmetrical, measured horizon. */
  health: "a broad symmetrical valley with two matched ridgelines meeting at the centre",
  /** Time on one position: a summit above cloud that has clearly been there a long time. */
  longestHold: "one enormous summit rising through a still sea of low cloud, everything below it quiet",
  /** A comparison: two ridges of obviously different scale, side by side. */
  holdRatio: "two mountain ridges of very different height standing side by side across the frame",
  /** Nothing sold in a panic: absolute stillness. */
  noPanic: "a perfectly still glacial lake mirroring a distant range, not a ripple on it",
  /** Consecutive sessions: a repeating ridgeline marching to the horizon. */
  streak: "an unbroken chain of identical peaks marching evenly to the horizon",
  /** One decision: a single peak catching the only light in the frame. */
  bestDecision: "a lone peak catching the only shaft of light in an otherwise dark range",
  /** A fall you stayed through: a deep canyon with the far wall lit. */
  drawdownHeld: "a deep canyon cut between two cliffs, the far wall lit and the floor in shadow",
  /** Rhythm: dunes in a regular repeating period. */
  cadence: "long parallel sand dunes in a steady repeating rhythm receding to the horizon",
  /** Months: distinct layered ranges, one behind another. */
  monthlyPnl: "many distinct mountain ranges layered one behind another, each a paler silhouette",
  /** A curve: one long rising ridgeline sweeping across the frame. */
  equity: "one long unbroken ridgeline rising steadily from left to right across the frame",
  /** The year: a wide panorama of everything at once. */
  wrapped: "a vast panoramic range under a sky full of stars, the whole horizon visible",
};

/** Every kind has a scene, and no two kinds share one. */
export function sceneFor(kind: CardKind): string {
  return SCENE[kind];
}
