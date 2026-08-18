/**
 * The briefs for the app's ambient fields.
 *
 * Pure, like `lib/wrapped/prompt.ts` and `lib/unsplash/query.ts` — the words
 * are testable without a network, and `scripts/generate-ambient.mjs` is the
 * only thing that ever calls a model with them.
 *
 * ── Why an image at all, and where it may go ──
 *
 * A generated picture must never be a *loading* screen's only content: it is a
 * download you are asked to wait for while you are already waiting for a
 * download, and it lands after the thing it stood in for. So every surface
 * that reads one of these layers it **over** a CSS gradient that already says
 * the same thing — the file is a refinement of a finished design, never the
 * design. A deployment with no key, or a cold cache on a slow connection, gets
 * the gradient and is not missing anything structural.
 *
 * ── What they may contain ──
 *
 * Nothing. That is the point. These are atmospheres: light, depth and grain,
 * with an empty centre wherever type or a figure will sit. The same
 * prohibitions the Wrapped art prompt carries apply and for the same reason —
 * a model that draws a numeral has drawn a number nobody can correct, on a
 * product whose whole claim is that its figures came off a brokerage.
 */

export interface AmbientField {
  /** File stem under `public/ambient`. */
  key: string;
  /** What the field sits behind, for the script's own log. */
  where: string;
  /** Pixel size written to disk. Wide and short for a page field. */
  width: number;
  height: number;
  /** The hues, in the order the brief names them. */
  palette: string;
  /** Where the composition must stay quiet. */
  quiet: string;
}

/**
 * Stated once and shared, because these are the rules rather than the
 * direction. `COMPOSITION` is not in here — it is per field, and it is the
 * negative of wherever that field's content sits.
 */
export const CONSTRAINTS = [
  "No text, no numerals, no letters, no glyphs, no logos, no watermarks.",
  "No people, no faces, no hands, no animals, no objects, no products.",
  "No horizon line, no landscape, no architecture, no geometry, no grids.",
  "No hard edges, no rays, no beams, no lens flare, no stars, no sparkles.",
  "Nothing that reads as a subject: this is atmosphere, not a picture of anything.",
].join(" ");

/**
 * The three fields.
 *
 * Two worlds, because the product has two: the app runs on midnight plum and
 * the Wrapped flow runs on the artefact world's near-black. A field that
 * crossed between them would put the marketing palette inside the instrument,
 * which is the one leak `--mk-*` exists to prevent.
 */
export const FIELDS: AmbientField[] = [
  {
    key: "field-app",
    where: "the dashboard's waiting state and the page behind it",
    width: 1600,
    height: 900,
    palette:
      "a deep midnight plum near-black ground with violet in the black; one warm gold bloom low and to the left, one soft violet bloom upper right, and a faint deep ember low right",
    quiet:
      "The upper-left quadrant and the horizontal band across the middle must stay almost empty — the score, its ring and four dials are set there in type.",
  },
  {
    key: "field-wrapped",
    where: "the Wrapped flow's waiting state",
    width: 1600,
    height: 1000,
    palette:
      "a near-black ground; one violet bloom at the upper left, one warm amber bloom low right, and a faint rose bloom upper right",
    quiet:
      "The centre column must stay almost empty top to bottom — a tall poster stands there.",
  },
  {
    key: "hero-glow",
    where: "behind the score ring on the dashboard",
    width: 900,
    height: 900,
    palette:
      "a deep midnight plum near-black ground; a single warm gold bloom slightly below and left of centre, falling away to nothing at every edge",
    quiet:
      "The exact centre must be the quietest part of the frame — a ring and a character sit on it.",
  },
];

/**
 * The brief for one field.
 *
 * The medium leads, because an image model weights the front of a prompt
 * hardest and the thing that matters most here is that this is diffuse light
 * rather than a rendered scene.
 */
export function promptFor(field: AmbientField): string {
  return [
    "Extremely soft volumetric light diffused through deep water, rendered as an out-of-focus abstract field.",
    `Colour: ${field.palette}.`,
    "The blooms are vast, low-contrast and restrained — they never brighten past a whisper, and no edge of any bloom is findable.",
    "Fine organic film grain across the whole frame, like a long exposure pushed in the dark.",
    field.quiet,
    "Overall the image is very dark: a viewer should read it as atmosphere behind an interface, not as an image in its own right.",
    CONSTRAINTS,
  ].join(" ");
}
