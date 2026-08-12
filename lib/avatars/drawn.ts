import { ARCHETYPES } from "@/lib/archetypes";

/**
 * The sixteen archetype avatars, drawn by us.
 *
 * **They are characters, not diagrams.** An archetype is the one thing in the
 * product that goes next to a person's name, and the first two passes at it —
 * thin line marks, then neon glyphs from an image model — both read as
 * instrumentation. Nobody wants a schematic as their profile picture. So each
 * one is a chunky little character with a face, and it is still built out of
 * the abstract form named in `ARCHETYPES[n].emblem`: the Sentinel's column
 * stands up and gets eyes, the Metronome's five even strokes become five
 * bars with the tallest doing the looking.
 *
 * That keeps the two things that were worth keeping. The form still comes from
 * the emblem table, so the table stays the single description of what an
 * archetype looks like. And moss still carries the reading — a character with
 * more moss in it is a profile with more components above the bar, which is
 * exactly what the archetype means. Nothing here is decorative.
 *
 * Drawn rather than generated: these render on the first paint, on a
 * deployment with no image model, at any size, and identically every time.
 */

const VIEWBOX = 96;

/** The emblem body, for inlining in a component where tokens resolve. */
export function emblemBody(key: string): string {
  return BODIES[key] ?? BODIES.improviser;
}

export const AVATAR_VIEWBOX = `0 0 ${VIEWBOX} ${VIEWBOX}`;

/*
 * Two masses and one cut. Moss is the disciplined part of the form, ink at low
 * opacity is the part that is not above the bar, and the face is punched out of
 * whichever mass it sits on so it reads as a hole rather than as more drawing.
 */
const MASS = 'fill="var(--moss)"';
const DIM = 'fill="currentColor" fill-opacity=".3"';
const CUT = 'fill="var(--share-bg)"';
const MASS_S = 'stroke="var(--moss)" stroke-linecap="round" fill="none"';
const DIM_S = 'stroke="currentColor" stroke-opacity=".3" stroke-linecap="round" fill="none"';

type Mouth = "smile" | "flat" | "small" | "squiggle" | "none";

/**
 * A face, punched into the mass under it.
 *
 * Eyes stay at least 3px in a 96 box so they survive the 52px the avatar
 * renders at on Home — below that they close up into a smudge and the
 * character stops being one.
 */
function face(
  cx: number,
  cy: number,
  { spread = 8, r = 4, mouth = "smile" as Mouth, ink = CUT } = {},
): string {
  const stroke = ink === CUT ? "var(--share-bg)" : "var(--moss)";
  const line = `stroke="${stroke}" stroke-width="2.8" stroke-linecap="round" fill="none"`;
  const my = cy + r + 4;
  const mouths: Record<Mouth, string> = {
    smile: `<path ${line} d="M${cx - 5} ${my}q5 4.5 10 0" />`,
    flat: `<path ${line} d="M${cx - 4} ${my}h8" />`,
    small: `<path ${line} d="M${cx - 3} ${my}q3 3 6 0" />`,
    squiggle: `<path ${line} d="M${cx - 6} ${my}q3 3.5 6 0t6 0" />`,
    none: "",
  };
  return [
    `<circle ${ink} cx="${cx - spread}" cy="${cy}" r="${r}" />`,
    `<circle ${ink} cx="${cx + spread}" cy="${cy}" r="${r}" />`,
    mouths[mouth],
  ].join("");
}

/** Two closed arcs where eyes would be — the sleepy ones. */
function restingEyes(cx: number, cy: number, spread = 8): string {
  const line = 'stroke="var(--share-bg)" stroke-width="3" stroke-linecap="round" fill="none"';
  return [
    `<path ${line} d="M${cx - spread - 4} ${cy}q4 4 8 0" />`,
    `<path ${line} d="M${cx + spread - 4} ${cy}q4 4 8 0" />`,
  ].join("");
}

const BODIES: Record<string, string> = {
  // Nothing above the bar: a scruffy blob, tufts at four different angles.
  improviser: `
    <path ${DIM_S} stroke-width="6" d="M27 27l7 8" />
    <path ${DIM_S} stroke-width="6" d="M71 26l-6 9" />
    <path ${DIM_S} stroke-width="6" d="M82 47l-10 2" />
    <path ${DIM_S} stroke-width="6" d="M14 45l10 3" />
    <circle ${DIM} cx="48" cy="52" r="24" />
    ${face(48, 48, { spread: 8, r: 4, mouth: "squiggle" })}`,

  // Exposure only: one narrow figure held between two wide margins.
  sized: `
    <rect ${DIM} x="14" y="22" width="10" height="52" rx="5" />
    <rect ${DIM} x="72" y="22" width="10" height="52" rx="5" />
    <rect ${MASS} x="37" y="18" width="22" height="60" rx="11" />
    ${face(48, 38, { spread: 5.5, r: 3.4, mouth: "small" })}`,

  // Patience only: a long band lying down, with a soft leading edge.
  patient: `
    <rect ${MASS} x="12" y="34" width="60" height="28" rx="14" />
    <rect ${DIM} x="76" y="41" width="9" height="14" rx="4.5" />
    ${restingEyes(38, 46, 9)}
    <path stroke="var(--share-bg)" stroke-width="2.8" stroke-linecap="round" fill="none" d="M35 55q4 3.5 8 0" />`,

  // Patience and exposure: a heavy cap seated on a stem.
  anchor: `
    <rect ${MASS} x="14" y="24" width="68" height="22" rx="11" />
    <rect ${MASS} x="41" y="42" width="14" height="28" rx="7" />
    <path ${DIM_S} stroke-width="6" d="M30 62q18 14 36 0" />
    ${face(48, 34, { spread: 9, r: 3.8, mouth: "flat" })}`,

  // Consistency only: five even strokes, the tallest doing the looking.
  metronome: `
    <rect ${MASS} x="14" y="42" width="11" height="30" rx="5.5" />
    <rect ${MASS} x="29" y="42" width="11" height="30" rx="5.5" />
    <rect ${MASS} x="43" y="22" width="17" height="50" rx="8.5" />
    <rect ${MASS} x="64" y="42" width="11" height="30" rx="5.5" />
    <rect ${MASS} x="79" y="42" width="11" height="30" rx="5.5" />
    ${face(51.5, 36, { spread: 4.6, r: 3.1, mouth: "small" })}`,

  // Consistency and exposure: the same square, repeated in both directions.
  regular: `
    <rect ${MASS} x="18" y="18" width="28" height="28" rx="9" />
    <rect ${MASS} x="52" y="18" width="28" height="28" rx="9" />
    <rect ${MASS} x="18" y="52" width="28" height="28" rx="9" />
    <rect ${MASS} x="52" y="52" width="28" height="28" rx="9" />
    ${face(32, 29, { spread: 6, r: 3.4, mouth: "small" })}`,

  // Consistency and patience: a head riding three waves of one period.
  tide: `
    <path ${MASS_S} stroke-width="9" d="M10 56q9.5-11 19 0t19 0 19 0 19 0" />
    <path ${DIM_S} stroke-width="9" d="M10 74q9.5-11 19 0t19 0 19 0 19 0" />
    <circle ${MASS} cx="48" cy="32" r="15" />
    ${face(48, 30, { spread: 6, r: 3.6, mouth: "smile" })}`,

  // Consistency, patience and exposure: a level wedge, wide end forward.
  keel: `
    <path ${MASS} d="M46 33l40 15-40 15z" />
    <ellipse ${MASS} cx="36" cy="48" rx="20" ry="16" />
    ${face(33, 45, { spread: 7, r: 3.8, mouth: "flat" })}`,

  // Adherence only: one mark held exactly between two rules.
  measured: `
    <rect ${DIM} x="12" y="20" width="72" height="9" rx="4.5" />
    <rect ${DIM} x="12" y="67" width="72" height="9" rx="4.5" />
    <rect ${MASS} x="33" y="34" width="30" height="28" rx="14" />
    ${face(48, 45, { spread: 6.5, r: 3.6, mouth: "flat" })}`,

  // Adherence and exposure: a ring governed at two points, looking out of it.
  governor: `
    <circle ${MASS_S} stroke-width="11" cx="48" cy="50" r="21" />
    <path ${DIM_S} stroke-width="6" d="M48 14v9" />
    <path ${DIM_S} stroke-width="6" d="M48 77v9" />
    ${face(48, 47, { spread: 7, r: 3.6, mouth: "small", ink: MASS })}`,

  // Adherence and patience: one tall column standing alone.
  sentinel: `
    <rect ${MASS} x="33" y="14" width="30" height="58" rx="15" />
    <rect ${DIM} x="25" y="74" width="46" height="9" rx="4.5" />
    ${face(48, 33, { spread: 7.5, r: 4, mouth: "flat" })}`,

  // Adherence, patience and exposure: three courses, stacked.
  bulwark: `
    <rect ${MASS} x="14" y="22" width="68" height="17" rx="8" />
    <rect ${MASS} x="14" y="43" width="68" height="17" rx="8" />
    <rect ${DIM} x="14" y="64" width="68" height="17" rx="8" />
    ${face(48, 48, { spread: 9, r: 3.2, mouth: "small" })}`,

  // Adherence and consistency: a round face ticked on an even beat.
  clockwork: `
    <path ${DIM_S} stroke-width="5" d="M48 12v9" />
    <path ${DIM_S} stroke-width="5" d="M48 75v9" />
    <path ${DIM_S} stroke-width="5" d="M12 48h9" />
    <path ${DIM_S} stroke-width="5" d="M75 48h9" />
    <path ${DIM_S} stroke-width="5" d="M23 23l6 6" />
    <path ${DIM_S} stroke-width="5" d="M67 67l6 6" />
    <path ${DIM_S} stroke-width="5" d="M73 23l-6 6" />
    <path ${DIM_S} stroke-width="5" d="M29 67l-6 6" />
    <circle ${MASS} cx="48" cy="48" r="24" />
    ${face(48, 44, { spread: 8, r: 4, mouth: "smile" })}`,

  // Adherence, consistency and exposure: a lattice meeting at right angles.
  engineer: `
    <rect ${MASS} x="37" y="12" width="22" height="72" rx="11" />
    <rect ${MASS} x="12" y="37" width="72" height="22" rx="11" />
    ${face(48, 46, { spread: 6.5, r: 3.6, mouth: "small" })}`,

  // Adherence, consistency and patience: an arch on two even piers.
  steward: `
    <path ${MASS} d="M22 78V48a26 26 0 0 1 52 0v30H58V48a10 10 0 0 0-20 0v30z" />
    ${face(48, 28, { spread: 6.5, r: 3.2, mouth: "small" })}`,

  // Every component above the bar: one closed square, weightless and even.
  composed: `
    <rect ${MASS} x="20" y="20" width="56" height="56" rx="19" />
    ${face(48, 42, { spread: 9, r: 4.2, mouth: "smile" })}`,
};

/** Every key the avatar surfaces accept — the archetype table, and nothing else. */
export const AVATAR_KEYS = ARCHETYPES.map((a) => a.key);
