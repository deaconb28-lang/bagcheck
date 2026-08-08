import { ARCHETYPES } from "@/lib/archetypes";

/**
 * The sixteen archetype emblems, drawn by us.
 *
 * These are not a placeholder for the generated avatars — they are the
 * guarantee underneath them. An archetype is an identity the app puts next to
 * someone's name; it has to render on a deployment with no image model, on
 * the first paint before anything is fetched, and identically every time. So
 * the shape is ours and always available, and the generated art under
 * `public/archetypes` is the enrichment that sits on top of it. Which
 * archetypes have that art is `lib/avatars/manifest.ts`, generated from the
 * directory rather than maintained by hand.
 *
 * Each emblem is the abstract form named in `ARCHETYPES[n].emblem`, so the
 * table stays the single description of what an archetype looks like.
 *
 * Two colours only: `currentColor` for the form, `--moss` for the part that
 * carries the discipline reading. Nothing here is a decorative accent — an
 * emblem with more moss in it is a profile with more components above the
 * bar, which is exactly what the archetype means.
 */

const VIEWBOX = 96;

/** The emblem body, for inlining in a component where tokens resolve. */
export function emblemBody(key: string): string {
  return BODIES[key] ?? BODIES.improviser;
}

export const AVATAR_VIEWBOX = `0 0 ${VIEWBOX} ${VIEWBOX}`;

/*
 * Stroke geometry is shared so the sixteen read as one family. A thinner
 * weight than this and the marks stop holding at the 32px they render at in
 * a header; thicker and the denser emblems fill in.
 */
const W = 'stroke-width="5" stroke-linecap="round" fill="none"';
const INK = `stroke="currentColor" stroke-opacity=".38" ${W}`;
const MOSS = `stroke="var(--moss)" ${W}`;

const BODIES: Record<string, string> = {
  // Nothing above the bar: short strokes, no two at the same angle.
  improviser: `
    <path ${INK} d="M22 30l14 8" />
    <path ${INK} d="M58 24l10 14" />
    <path ${INK} d="M26 62l16-4" />
    <path ${INK} d="M56 70l14-10" />
    <path ${INK} d="M44 48l6 12" />`,

  // Exposure only: one narrow bar held between two wide margins.
  sized: `
    <path ${INK} d="M20 24v48" />
    <path ${INK} d="M76 24v48" />
    <path ${MOSS} d="M48 30v36" />`,

  // Patience only: a long band with a soft leading edge.
  patient: `
    <path ${MOSS} d="M20 48h44" />
    <path ${INK} d="M70 48h8" />`,

  // Patience and exposure: a bar seated on a stem.
  anchor: `
    <path ${MOSS} d="M20 38h56" />
    <path ${MOSS} d="M48 38v34" />
    <path ${INK} d="M34 66q14 12 28 0" />`,

  // Consistency only: five identical strokes, evenly spaced.
  metronome: `
    <path ${MOSS} d="M20 32v32" />
    <path ${MOSS} d="M34 32v32" />
    <path ${MOSS} d="M48 32v32" />
    <path ${MOSS} d="M62 32v32" />
    <path ${MOSS} d="M76 32v32" />`,

  // Consistency and exposure: the same square, repeated in both directions.
  regular: `
    <path ${MOSS} d="M26 26h12v12H26z" />
    <path ${MOSS} d="M58 26h12v12H58z" />
    <path ${MOSS} d="M26 58h12v12H26z" />
    <path ${MOSS} d="M58 58h12v12H58z" />`,

  // Consistency and patience: three waves of one unchanging period.
  tide: `
    <path ${MOSS} d="M18 34q10-10 20 0t20 0 20 0" />
    <path ${MOSS} d="M18 50q10-10 20 0t20 0 20 0" />
    <path ${INK} d="M18 66q10-10 20 0t20 0 20 0" />`,

  // Consistency, patience and exposure: a level tapered wedge.
  keel: `
    <path ${MOSS} d="M20 36l56 12-56 12" />
    <path ${INK} d="M20 48h50" />`,

  // Adherence only: two rules, one mark held exactly between them.
  measured: `
    <path ${INK} d="M20 30h56" />
    <path ${INK} d="M20 66h56" />
    <path ${MOSS} d="M48 42v12" />`,

  // Adherence and exposure: a ring governed at two points.
  governor: `
    <circle ${MOSS} cx="48" cy="48" r="22" />
    <path ${INK} d="M48 14v10" />
    <path ${INK} d="M48 72v10" />`,

  // Adherence and patience: one column standing alone.
  sentinel: `
    <path ${MOSS} d="M48 20v56" />
    <path ${INK} d="M36 76h24" />`,

  // Adherence, patience and exposure: three courses, stacked.
  bulwark: `
    <path ${MOSS} d="M20 34h56" />
    <path ${MOSS} d="M20 48h56" />
    <path ${MOSS} d="M20 62h56" />
    <path ${INK} d="M34 34v28" />
    <path ${INK} d="M62 34v28" />`,

  // Adherence and consistency: rings divided on an even beat.
  clockwork: `
    <circle ${MOSS} cx="48" cy="48" r="24" />
    <circle ${INK} cx="48" cy="48" r="12" />
    <path ${MOSS} d="M48 18v6" />
    <path ${MOSS} d="M78 48h-6" />
    <path ${MOSS} d="M48 78v-6" />
    <path ${MOSS} d="M18 48h6" />`,

  // Adherence, consistency and exposure: a lattice meeting at right angles.
  engineer: `
    <path ${MOSS} d="M32 20v56" />
    <path ${MOSS} d="M64 20v56" />
    <path ${MOSS} d="M20 32h56" />
    <path ${MOSS} d="M20 64h56" />`,

  // Adherence, consistency and patience: an arch on two even piers.
  steward: `
    <path ${MOSS} d="M24 74V48a24 24 0 0 1 48 0v26" />
    <path ${INK} d="M24 74h48" />`,

  // Every component above the bar: one closed square, weightless and even.
  composed: `
    <path ${MOSS} d="M26 26h44v44H26z" />`,
};

/** Every key the avatar surfaces accept — the archetype table, and nothing else. */
export const AVATAR_KEYS = ARCHETYPES.map((a) => a.key);
