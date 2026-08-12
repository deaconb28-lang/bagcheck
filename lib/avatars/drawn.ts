import { ARCHETYPES, type Archetype } from "@/lib/archetypes";

/**
 * The sixteen archetype avatars, drawn by us.
 *
 * **They are characters, not diagrams.** An archetype is the one thing in the
 * product that goes next to a person's name, and the first two passes at it —
 * thin line marks, then neon glyphs from an image model — both read as
 * instrumentation. Nobody wants a schematic as their profile picture. So each
 * one is a chunky character with a face, and it is still built out of the
 * abstract form named in `ARCHETYPES[n].emblem`: the Sentinel's column stands
 * up and gets eyes, the Metronome's five even strokes become five bars with
 * the tallest doing the looking.
 *
 * That keeps the two things worth keeping. The form still comes from the
 * emblem table, so the table stays the single description of what an archetype
 * looks like. And colour still carries the reading — the family is chosen by
 * how many score components sit above the bar, and the parts of a character
 * drawn in flat grey are the components that do not.
 *
 * Three devices give them weight: every mass is drawn twice, the lower copy in
 * the family's mid tone so the character has a solid underside; the eyes are
 * holes into the deep tone with a glint left in them; and most of the set sits
 * a few degrees off square, because sixteen shapes all locked to the axis read
 * as a chart.
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

export type AvatarFamily = "moss" | "ember" | "azure" | "violet";

/**
 * Which colour family an archetype wears.
 *
 * More components above the bar burns warmer. The colour is not assigned for
 * variety — it is the archetype saying the same thing its name does, which is
 * why this lives beside the drawing and is read by the image prompt too.
 */
export function avatarFamily(archetype: Archetype): AvatarFamily {
  if (archetype.strong.length >= 3) return "ember";
  if (archetype.strong.length === 2) return "moss";
  if (archetype.strong.length === 1) return "azure";
  return "violet";
}

export function avatarFamilyByKey(key: string): AvatarFamily {
  const found = ARCHETYPES.find((a) => a.key === key);
  return found ? avatarFamily(found) : "violet";
}

/*
 * The character's three tones plus one neutral. `--av-*` is set on the avatar's
 * own wrapper from the family, so the same drawing wears whichever palette the
 * archetype earned. Grey is not a fourth colour: it is the absence of one, and
 * it marks the part of the form that is not above the bar.
 */
const LIT = 'fill="var(--av-lit)"';
const MID = 'fill="var(--av-mid)"';
const DIM = 'fill="currentColor" fill-opacity=".26"';
const LIT_S = 'stroke="var(--av-lit)" stroke-linecap="round" fill="none"';
const MID_S = 'stroke="var(--av-mid)" stroke-linecap="round" fill="none"';
const DIM_S = 'stroke="currentColor" stroke-opacity=".26" stroke-linecap="round" fill="none"';

/** How far the mid-toned underside peeks out from beneath a mass. */
const LIFT = 4;

/**
 * A mass with its own underside — the same shape twice, the lower copy in the
 * family's mid tone. It is what stops these reading as flat cut paper.
 */
function solid(shape: (fill: string, dy: number) => string): string {
  return shape(MID, LIFT) + shape(LIT, 0);
}

type Mouth = "smile" | "grin" | "flat" | "small" | "squiggle";

/**
 * A face, punched into the mass under it.
 *
 * Eyes stay at least 3.4 units in a 96 box so they survive the 52px the avatar
 * renders at on Home, and each keeps a glint — one dot of the body colour left
 * inside the hole. Without it the eyes are two dead holes and the character
 * stops being alive.
 */
function face(
  cx: number,
  cy: number,
  { spread = 9, r = 4.6, mouth = "smile" as Mouth, on = "lit" as "lit" | "deep" } = {},
): string {
  /*
   * A face is normally a hole punched in the body. On a character whose face
   * falls on the tile's own ground rather than on its mass — the Governor
   * looks out through its ring — the marks invert, or they would be drawn in
   * the ground colour on the ground and vanish.
   */
  const marks = on === "lit" ? "var(--av-deep)" : "var(--av-lit)";
  const glints = on === "lit" ? "var(--av-lit)" : "var(--av-deep)";
  const line = `stroke="${marks}" stroke-width="3" stroke-linecap="round" fill="none"`;
  const my = cy + r + 4.5;
  const mouths: Record<Mouth, string> = {
    smile: `<path ${line} d="M${cx - 6} ${my}q6 5 12 0" />`,
    grin: `<path fill="${marks}" d="M${cx - 7} ${my - 2}h14a7 7 0 0 1-14 0z" />`,
    flat: `<path ${line} d="M${cx - 5} ${my}h10" />`,
    small: `<path ${line} d="M${cx - 3.5} ${my}q3.5 3.5 7 0" />`,
    squiggle: `<path ${line} d="M${cx - 7} ${my}q3.5 4 7 0t7 0" />`,
  };
  const eye = (x: number) =>
    `<circle fill="${marks}" cx="${x}" cy="${cy}" r="${r}" />` +
    `<circle fill="${glints}" cx="${x - r * 0.3}" cy="${cy - r * 0.34}" r="${r * 0.33}" />`;
  return eye(cx - spread) + eye(cx + spread) + mouths[mouth];
}

/** Two closed arcs where eyes would be — the one that is resting. */
function restingEyes(cx: number, cy: number, spread = 9): string {
  const line = 'stroke="var(--av-deep)" stroke-width="3.4" stroke-linecap="round" fill="none"';
  return [
    `<path ${line} d="M${cx - spread - 5} ${cy}q5 5 10 0" />`,
    `<path ${line} d="M${cx + spread - 5} ${cy}q5 5 10 0" />`,
  ].join("");
}

/** Sits the character a few degrees off square. */
function tilt(deg: number, body: string): string {
  return `<g transform="rotate(${deg} 48 48)">${body}</g>`;
}

const BODIES: Record<string, string> = {
  // Nothing above the bar: a scruffy grey blob, tufts at four different angles.
  improviser: tilt(
    -5,
    `
    <path ${DIM_S} stroke-width="7" d="M22 24l9 9" />
    <path ${DIM_S} stroke-width="7" d="M74 22l-7 10" />
    <path ${DIM_S} stroke-width="7" d="M87 46l-11 2" />
    <path ${DIM_S} stroke-width="7" d="M9 44l11 3" />
    <circle ${DIM} cx="48" cy="52" r="28" />
    ${face(48, 47, { spread: 9.5, r: 4.6, mouth: "squiggle" })}`,
  ),

  // Exposure only: one narrow figure held between two wide margins.
  sized: `
    <rect ${DIM} x="9" y="16" width="12" height="64" rx="6" />
    <rect ${DIM} x="75" y="16" width="12" height="64" rx="6" />
    ${solid((f, dy) => `<rect ${f} x="33" y="${12 + dy}" width="30" height="68" rx="15" />`)}
    ${face(48, 36, { spread: 7, r: 4.2, mouth: "small" })}`,

  // Patience only: a long band lying down, with a soft leading edge.
  patient: tilt(
    -3,
    `
    <rect ${DIM} x="76" y="38" width="11" height="18" rx="5.5" />
    ${solid((f, dy) => `<rect ${f} x="7" y="${29 + dy}" width="66" height="34" rx="17" />`)}
    ${restingEyes(36, 44, 10)}
    <path stroke="var(--av-deep)" stroke-width="3" stroke-linecap="round" fill="none" d="M31 54q5 4.5 10 0" />`,
  ),

  // Patience and exposure: a heavy cap seated on a stem.
  anchor: `
    <path ${DIM_S} stroke-width="7" d="M26 62q22 17 44 0" />
    ${solid((f, dy) => `<rect ${f} x="40" y="${40 + dy}" width="16" height="32" rx="8" />`)}
    ${solid((f, dy) => `<rect ${f} x="9" y="${18 + dy}" width="78" height="26" rx="13" />`)}
    ${face(48, 30, { spread: 11, r: 4.4, mouth: "flat" })}`,

  // Consistency only: five even strokes, the tallest doing the looking.
  metronome: `
    ${solid((f, dy) => `<rect ${f} x="9" y="${40 + dy}" width="12" height="34" rx="6" />`)}
    ${solid((f, dy) => `<rect ${f} x="25" y="${40 + dy}" width="12" height="34" rx="6" />`)}
    ${solid((f, dy) => `<rect ${f} x="59" y="${40 + dy}" width="12" height="34" rx="6" />`)}
    ${solid((f, dy) => `<rect ${f} x="75" y="${40 + dy}" width="12" height="34" rx="6" />`)}
    ${solid((f, dy) => `<rect ${f} x="40" y="${16 + dy}" width="20" height="58" rx="10" />`)}
    ${face(50, 32, { spread: 5.2, r: 3.6, mouth: "small" })}`,

  // Consistency and exposure: the same square, repeated in both directions.
  regular: tilt(
    -4,
    `
    ${solid((f, dy) => `<rect ${f} x="50" y="${12 + dy}" width="32" height="32" rx="10" />`)}
    ${solid((f, dy) => `<rect ${f} x="14" y="${48 + dy}" width="32" height="32" rx="10" />`)}
    ${solid((f, dy) => `<rect ${f} x="50" y="${48 + dy}" width="32" height="32" rx="10" />`)}
    ${solid((f, dy) => `<rect ${f} x="14" y="${12 + dy}" width="32" height="32" rx="10" />`)}
    ${face(30, 25, { spread: 6.6, r: 3.8, mouth: "small" })}`,
  ),

  // Consistency and patience: a head riding waves of one unchanging period.
  tide: `
    <path ${MID_S} stroke-width="10" d="M6 78q10.5-12 21 0t21 0 21 0 21 0" />
    <path ${LIT_S} stroke-width="10" d="M6 60q10.5-12 21 0t21 0 21 0 21 0" />
    ${solid((f, dy) => `<circle ${f} cx="48" cy="${30 + dy}" r="19" />`)}
    ${face(48, 27, { spread: 7.5, r: 4.2, mouth: "grin" })}`,

  // Consistency, patience and exposure: a level wedge, wide end forward.
  keel: `
    ${solid((f, dy) => `<path ${f} d="M50 ${26 + dy}l40 22-40 22z" />`)}
    ${solid((f, dy) => `<ellipse ${f} cx="36" cy="${48 + dy}" rx="26" ry="21" />`)}
    ${face(32, 44, { spread: 8.5, r: 4.4, mouth: "flat" })}`,

  // Adherence only: one mark held exactly between two rules.
  measured: `
    <rect ${DIM} x="7" y="14" width="82" height="10" rx="5" />
    <rect ${DIM} x="7" y="72" width="82" height="10" rx="5" />
    ${solid((f, dy) => `<rect ${f} x="27" y="${30 + dy}" width="42" height="32" rx="16" />`)}
    ${face(48, 42, { spread: 8, r: 4.2, mouth: "flat" })}`,

  // Adherence and exposure: a ring governed at two points, looking out of it.
  governor: `
    <path ${DIM_S} stroke-width="7" d="M48 8v11" />
    <path ${DIM_S} stroke-width="7" d="M48 88v-11" />
    <circle ${MID_S} stroke-width="14" cx="48" cy="52" r="26" />
    <circle ${LIT_S} stroke-width="14" cx="48" cy="48" r="26" />
    ${face(48, 44, { spread: 7, r: 3.8, mouth: "small", on: "deep" })}`,

  // Adherence and patience: one tall column standing alone.
  sentinel: tilt(
    -4,
    `
    <rect ${DIM} x="21" y="79" width="54" height="10" rx="5" />
    ${solid((f, dy) => `<rect ${f} x="30" y="${8 + dy}" width="36" height="68" rx="18" />`)}
    ${face(48, 30, { spread: 8.5, r: 4.6, mouth: "flat" })}`,
  ),

  // Adherence, patience and exposure: three courses, stacked.
  bulwark: `
    <rect ${DIM} x="8" y="66" width="80" height="20" rx="9" />
    ${solid((f, dy) => `<rect ${f} x="8" y="${40 + dy}" width="80" height="20" rx="9" />`)}
    ${solid((f, dy) => `<rect ${f} x="8" y="${14 + dy}" width="80" height="20" rx="9" />`)}
    ${face(48, 22, { spread: 11, r: 3.8, mouth: "flat" })}`,

  // Adherence and consistency: a round face ticked on an even beat.
  clockwork: `
    <path ${DIM_S} stroke-width="6" d="M48 5v10" />
    <path ${DIM_S} stroke-width="6" d="M48 91v-10" />
    <path ${DIM_S} stroke-width="6" d="M5 48h10" />
    <path ${DIM_S} stroke-width="6" d="M91 48h-10" />
    <path ${DIM_S} stroke-width="6" d="M18 18l7 7" />
    <path ${DIM_S} stroke-width="6" d="M78 78l-7-7" />
    <path ${DIM_S} stroke-width="6" d="M78 18l-7 7" />
    <path ${DIM_S} stroke-width="6" d="M18 78l7-7" />
    ${solid((f, dy) => `<circle ${f} cx="48" cy="${46 + dy}" r="28" />`)}
    ${face(48, 42, { spread: 9.5, r: 4.8, mouth: "grin" })}`,

  // Adherence, consistency and exposure: a lattice meeting at right angles.
  engineer: tilt(
    -4,
    `
    ${solid((f, dy) => `<rect ${f} x="6" y="${34 + dy}" width="84" height="26" rx="13" />`)}
    ${solid((f, dy) => `<rect ${f} x="35" y="${6 + dy}" width="26" height="82" rx="13" />`)}
    ${face(48, 42, { spread: 7.5, r: 4.2, mouth: "small" })}`,
  ),

  // Adherence, consistency and patience: an arch on two even piers.
  steward: `
    ${solid(
      (f, dy) =>
        `<path ${f} d="M16 ${84 + dy}V48a32 32 0 0 1 64 0v${36}H60V48a12 12 0 0 0-24 0v${36}z" />`,
    )}
    ${face(48, 26, { spread: 7.5, r: 4, mouth: "small" })}`,

  // Every component above the bar: one closed square, weightless and even.
  composed: tilt(
    -3,
    `
    ${solid((f, dy) => `<rect ${f} x="13" y="${13 + dy}" width="70" height="70" rx="24" />`)}
    ${face(48, 40, { spread: 12, r: 5.2, mouth: "grin" })}`,
  ),
};

/** Every key the avatar surfaces accept — the archetype table, and nothing else. */
export const AVATAR_KEYS = ARCHETYPES.map((a) => a.key);
