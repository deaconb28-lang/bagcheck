import type { CardHue, CardKind } from "@/lib/cards/kinds";

/**
 * The art brief — how one person's numbers become one person's picture.
 *
 * This is the layer the whole "generated Wrapped" claim rests on. Twelve
 * fixed backdrops shared by every user is not generated art, it is stock
 * photography with a nightly job attached. A card is supposed to be *yours*,
 * and that only means something if the picture changes when your numbers do.
 *
 * So four measured quantities come out of the ledger and drive the image:
 *
 * - **magnitude** — how far this figure is along the road to being scarce.
 *   A 412-day hold is near the top of its scale and gets a colossal, dominant
 *   form; a 34-day hold gets a modest one.
 * - **direction** — whether the thing went up, down or nowhere. Light rises
 *   or falls with it.
 * - **texture** — how uneven the series behind the number is. A steady
 *   cadence draws smooth strata; a violent P&L year draws shattered rock.
 * - **density** — how many things are behind it. Nineteen round trips is a
 *   different picture from two hundred.
 *
 * **The model still never draws a glyph.** The numbers shape the composition;
 * they are never rendered as pixels. A generated "412" is a figure nobody can
 * correct after the fact, on an artefact whose entire claim is that its
 * numbers came from a brokerage — and image models garble digits besides. The
 * type is composited over the art by us, in `app/og/[slug]/render.tsx`.
 *
 * Pure, so what gets asked for is testable without spending anything.
 */

export interface ArtShape {
  /** 0–1. How extreme the figure is on its own scale. */
  magnitude: number;
  direction: "up" | "down" | "flat";
  /** 0–1. How uneven the series behind the figure is. */
  texture: number;
  /** How many observations stand behind it. */
  density: number;
}

export interface ArtBrief {
  kind: CardKind;
  hue: CardHue;
  shape: ArtShape;
  /** The landform this kind is about. From lib/wrapped/scenes.ts. */
  scene: string;
}

/** Clamp into 0–1 — every caller is dividing by a threshold that can be beaten. */
export const unit = (n: number) => Math.max(0, Math.min(1, n));

/**
 * How uneven a series is: mean absolute step between neighbours, scaled by
 * the largest value in it. A flat line is 0; a series that reverses every
 * session approaches 1.
 */
export function textureOf(series: number[]): number {
  if (series.length < 3) return 0;
  const peak = Math.max(...series.map(Math.abs));
  if (peak === 0) return 0;
  let steps = 0;
  for (let i = 1; i < series.length; i += 1) {
    steps += Math.abs(series[i] - series[i - 1]);
  }
  return unit(steps / (series.length - 1) / peak);
}

/** Whether a series ends above, below, or level with where it began. */
export function directionOf(series: number[]): ArtShape["direction"] {
  if (series.length < 2) return "flat";
  const first = series[0];
  const last = series[series.length - 1];
  const span = Math.max(...series.map(Math.abs)) || 1;
  const move = (last - first) / span;
  if (move > 0.08) return "up";
  if (move < -0.08) return "down";
  return "flat";
}

/*
 * Each axis maps to a phrase rather than a number, because that is what an
 * image model acts on. The bands are wide on purpose: five magnitudes is
 * five visibly different pictures, and twenty would be twenty prompts that
 * produce the same one.
 */
const MASS = [
  "small and distant, most of the frame given to empty sky",
  "modest, sitting low in the frame",
  "substantial, filling the lower third",
  "large and close, dominating the lower half",
  "colossal, towering out of the top of the frame",
];

const SURFACE = [
  "glass-smooth and unbroken, almost geological",
  "gently ridged, weathered but even",
  "clearly striated, with visible steps and shelves",
  "broken and irregular, fractured along many angles",
  "shattered and chaotic, jagged in every direction",
];

const LIGHT: Record<ArtShape["direction"], string> = {
  up: "the light source rising behind the form from the lower left, throwing everything upward",
  down: "the light source sinking behind the form toward the lower right, long shadows falling forward",
  flat: "flat even light from directly behind, the form in near-silhouette",
};

const CROWD = [
  "a single form standing alone",
  "two or three forms, clearly separate",
  "a dozen forms in loose ranks",
  "many dozens of forms receding into haze",
  "hundreds of forms, an unbroken field of them",
];

/** Where the light comes from, by hue family. Matches the `--card-*` tokens. */
const HUE_LIGHT: Record<CardHue, string> = {
  moss: "a low emerald-green sun, cool jade sky above",
  ember: "a blazing orange sun, deep red-black sky above",
  azure: "a cold blue dawn, deep navy sky above",
  violet: "a violet and magenta sunrise, deep indigo sky above",
};

const band = (n: number, list: string[]) =>
  list[Math.min(list.length - 1, Math.floor(unit(n) * list.length))];

/**
 * Things that would break the system if the model produced them.
 *
 * The first line is the load-bearing one: the card's numbers are set in type
 * by us, and a model drawing a digit would be both wrong and uncorrectable.
 */
const CONSTRAINTS = [
  "Absolutely no text, letters, numbers, digits, words or symbols anywhere in the image.",
  "No logos, charts, graphs, bars, arrows, coins, currency or financial iconography.",
  "No people, faces, hands, animals, buildings, roads or vehicles.",
  "Landscape only: rock, sky, cloud, water, light.",
].join(" ");

const COMPOSITION =
  "Cinematic vertical composition, 2:3 portrait. " +
  "The top third is empty, near-black sky with nothing in it. " +
  "Deep saturated colour, high contrast, dramatic rim light. " +
  "Digital matte painting, poster art, clean and graphic rather than photographic.";

/**
 * The prompt for one person's card.
 *
 * Two people who both hold The Sentinel get the same *scene*, because the
 * scene belongs to the card kind — but a different mountain, because the
 * mountain is built from their own magnitude, texture, direction and count.
 */
export function artPromptFor(brief: ArtBrief): string {
  const { shape } = brief;
  return [
    `A dramatic landscape for a poster: ${brief.scene}.`,
    `The form is ${band(shape.magnitude, MASS)}.`,
    `Its surface is ${band(shape.texture, SURFACE)}.`,
    `${capitalise(band(densityScale(shape.density), CROWD))} in view.`,
    `${capitalise(HUE_LIGHT[brief.hue])}, with ${LIGHT[shape.direction]}.`,
    COMPOSITION,
    CONSTRAINTS,
  ].join(" ");
}

/** Counts are long-tailed, so the crowd scale is logarithmic. */
export function densityScale(count: number): number {
  if (count <= 1) return 0;
  return unit(Math.log10(count) / 2.6);
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * A stable key for one brief.
 *
 * Art is generated once per distinct picture, not once per mint: minting the
 * same card twice in a week should not draw two mountains and bill for both.
 * Banding is what makes this work — two runs whose numbers moved a little
 * land in the same bands and reuse the image.
 */
export function briefKey(brief: ArtBrief): string {
  const { shape } = brief;
  const b = (n: number, len: number) => Math.min(len - 1, Math.floor(unit(n) * len));
  return [
    brief.kind,
    brief.hue,
    b(shape.magnitude, MASS.length),
    b(shape.texture, SURFACE.length),
    b(densityScale(shape.density), CROWD.length),
    shape.direction,
  ].join(":");
}
