import type { ScoreComponents } from "@/lib/score";

/**
 * The sixteen archetypes.
 *
 * The score has four components, and each one is either above the strong bar
 * or it is not — so a profile is four bits, and there are exactly sixteen of
 * them. Nothing here is invented to reach a round number: every archetype is
 * one corner of that cube, and every user is in exactly one.
 *
 * **The bar is fixed, not relative.** An archetype is an identity people put
 * on a share card, so "The Sentinel" has to mean the same thing whoever is
 * wearing it. Scored against each person's own mean it would not — two people
 * with completely different records would carry the same badge because each
 * was above their own average.
 *
 * The names are observational and none of them is a grade. A profile with
 * nothing above the bar is The Improviser, which is a description of how the
 * weeks read, not a verdict on the person having them.
 */

/** Above this, a component counts as strong. Fixed for everyone, on purpose. */
export const STRONG = 60;

export type ArchetypeTone = "moss" | "ink";

export interface Archetype {
  /** Stable slug — the avatar asset and the share-card URL are keyed on it. */
  key: string;
  name: string;
  line: string;
  /** Which components are above the bar. Empty for The Improviser. */
  strong: Array<keyof ScoreComponents>;
  tone: ArchetypeTone;
  /**
   * The abstract form its avatar is drawn as. Held here rather than in the
   * image prompt so the sixteen marks are visibly distinct by construction
   * and not by whatever a model happened to draw twice.
   */
  emblem: string;
}

/*
 * Bit order is adherence, consistency, patience, exposure — most significant
 * first — so the index of a profile is (A<<3)|(C<<2)|(P<<1)|E and the table
 * below reads in binary order.
 */
const ORDER: Array<keyof ScoreComponents> = ["adherence", "consistency", "patience", "exposure"];

export const ARCHETYPES: Archetype[] = [
  {
    key: "improviser",
    name: "The Improviser",
    line: "Nothing has settled into a habit yet — each week reads differently from the last.",
    strong: [],
    tone: "ink",
    emblem: "a scattering of short unaligned strokes, no two at the same angle",
  },
  {
    key: "sized",
    name: "The Sized",
    line: "Your positions stay inside your own band, and nothing else has settled.",
    strong: ["exposure"],
    tone: "ink",
    emblem: "one narrow vertical bar held between two wide margins",
  },
  {
    key: "patient",
    name: "The Patient",
    line: "You hold through the part that makes most people sell.",
    strong: ["patience"],
    tone: "ink",
    emblem: "a single long horizontal band with a very soft leading edge",
  },
  {
    key: "anchor",
    name: "The Anchor",
    line: "You hold for a long time, at a size that does not move.",
    strong: ["patience", "exposure"],
    tone: "moss",
    emblem: "one heavy horizontal bar seated on a short vertical stem",
  },
  {
    key: "metronome",
    name: "The Metronome",
    line: "Your cadence barely changes, week over week.",
    strong: ["consistency"],
    tone: "ink",
    emblem: "five evenly spaced vertical strokes of identical height",
  },
  {
    key: "regular",
    name: "The Regular",
    line: "Same rhythm and same size, whatever the week looks like.",
    strong: ["consistency", "exposure"],
    tone: "moss",
    emblem: "a grid of identical small squares, evenly spaced in both directions",
  },
  {
    key: "tide",
    name: "The Tide",
    line: "Long holds, arriving on a steady cadence.",
    strong: ["consistency", "patience"],
    tone: "moss",
    emblem: "three stacked waves of one unchanging period",
  },
  {
    key: "keel",
    name: "The Keel",
    line: "Cadence, hold time and size all sit still.",
    strong: ["consistency", "patience", "exposure"],
    tone: "moss",
    emblem: "a long tapered horizontal wedge, perfectly level",
  },
  {
    key: "measured",
    name: "The Measured",
    line: "You trade the plan you wrote, and it has not drifted.",
    strong: ["adherence"],
    tone: "ink",
    emblem: "two parallel rules with a single mark held exactly between them",
  },
  {
    key: "governor",
    name: "The Governor",
    line: "The plan holds, and so does the size behind it.",
    strong: ["adherence", "exposure"],
    tone: "moss",
    emblem: "a ring with two short radial spokes at opposite ends",
  },
  {
    key: "sentinel",
    name: "The Sentinel",
    line: "You wait for your own setup, then wait again after taking it.",
    strong: ["adherence", "patience"],
    tone: "moss",
    emblem: "one tall narrow column standing alone in open space",
  },
  {
    key: "bulwark",
    name: "The Bulwark",
    line: "Plan, hold time and size hold together.",
    strong: ["adherence", "patience", "exposure"],
    tone: "moss",
    emblem: "three thick horizontal courses stacked like masonry",
  },
  {
    key: "clockwork",
    name: "The Clockwork",
    line: "The same plan, run on the same schedule.",
    strong: ["adherence", "consistency"],
    tone: "moss",
    emblem: "concentric rings divided by evenly spaced radial ticks",
  },
  {
    key: "engineer",
    name: "The Engineer",
    line: "Plan, cadence and size move as one.",
    strong: ["adherence", "consistency", "exposure"],
    tone: "moss",
    emblem: "an interlocking lattice of straight lines meeting at right angles",
  },
  {
    key: "steward",
    name: "The Steward",
    line: "A written plan, run slowly and on schedule.",
    strong: ["adherence", "consistency", "patience"],
    tone: "moss",
    emblem: "a wide arch resting on two even piers",
  },
  {
    key: "composed",
    name: "The Composed",
    line: "All four components sit above the line at once.",
    strong: ["adherence", "consistency", "patience", "exposure"],
    tone: "moss",
    emblem: "a single closed square, centred, with weightless even sides",
  },
];

/** Index of a component profile in the table above. */
export function archetypeIndex(components: ScoreComponents | null): number {
  if (!components) return 0;
  return ORDER.reduce(
    (bits, key, i) => bits | ((components[key] >= STRONG ? 1 : 0) << (3 - i)),
    0,
  );
}

/**
 * The archetype a profile lands in. Never null — sixteen corners cover every
 * possible profile, including the one where nothing is above the bar.
 */
export function archetypeFor(components: ScoreComponents | null): Archetype {
  return ARCHETYPES[archetypeIndex(components)];
}

export function archetypeByKey(key: string): Archetype | null {
  return ARCHETYPES.find((a) => a.key === key) ?? null;
}

/** The mono line under an archetype: which components put you there. */
export function strongLine(archetype: Archetype): string {
  if (!archetype.strong.length) return `Nothing above ${STRONG} yet`;
  return `${archetype.strong.join(" · ")} above ${STRONG}`;
}
