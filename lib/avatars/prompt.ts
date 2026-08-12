import type { Archetype } from "@/lib/archetypes";

/**
 * The prompt for an archetype avatar — pure, so what gets asked for is
 * testable without spending anything.
 *
 * Sixteen images, generated once for the whole product rather than once per
 * user: an archetype is a shared identity, so two people who are both The
 * Sentinel must be wearing the same mark. That is also why the emblem shape
 * comes from `ARCHETYPES[n].emblem` and not from the model's imagination —
 * the form is decided by us, and the model is drawing it, not inventing it.
 *
 * The avatar is a character: a chunky mascot built out of the emblem's form,
 * with a simple two-dot face. Two earlier passes — flat line art, then neon
 * glyphs on a dark field — both read as instrumentation, and nobody wants a
 * schematic as their profile picture.
 *
 * The face is drawn as two dots and a mouth and nothing else. A rendered human
 * face beside a person's name would be a claim about who they are; a cartoon
 * one at two dots wide cannot be mistaken for one, which is the line this
 * prompt holds.
 *
 * `lib/avatars/drawn.ts` is the reference these have to match — it is what
 * ships today, and a generated set that does not sit beside it is worse than
 * no generated set at all.
 */

const CONSTRAINTS = [
  "Absolutely no text, letters, numbers, words, digits or symbols anywhere.",
  "No logos, charts, arrows, coins, currency or financial iconography.",
  "No human faces, no hands, no bodies, no animals, no plants, no branded or",
  "recognisable objects. The only face is the two dots and the mouth described",
  "above, drawn flat on the shape itself.",
  "One centred character and nothing else.",
  "No border, no frame, no vignette, no drop shadow, no gradient mesh, no",
  "bevelled or chrome metal, no 3D render, no glow.",
].join(" ");

/**
 * The one flat colour the character is filled in, per hue family. Named after
 * the `--card-*` families so an avatar and the card it sits on read as one
 * object.
 */
const GLOW: Record<string, string> = {
  moss: "flat emerald green (#57D69D)",
  ember: "flat warm amber-orange (#FF9B45)",
  azure: "flat cold blue (#62B0F5)",
  violet: "flat violet-magenta (#B48BFF)",
};

/**
 * Which family an archetype is lit in. Moss is discipline, so the archetypes
 * with more components above the bar burn brighter — the colour is carrying
 * the same reading the name is, rather than being assigned for variety.
 */
export function avatarHue(archetype: Archetype): keyof typeof GLOW {
  if (archetype.strong.length >= 3) return "ember";
  if (archetype.strong.length === 2) return "moss";
  if (archetype.strong.length === 1) return "azure";
  return "violet";
}

export function avatarPrompt(archetype: Archetype): string {
  const fill = GLOW[avatarHue(archetype)];
  return [
    `A chunky cartoon mascot, centred on a plain near-black field, whose whole`,
    `body is this shape: ${archetype.emblem}.`,
    `The body is filled in ${fill} with soft rounded corners and no outline.`,
    "Two small round eyes and one small curved mouth are punched out of the body",
    "in the background colour, like holes cut in paper — the entire face.",
    "Flat vector sticker art, thick friendly forms, one flat colour and one cut.",
    "Generous empty margin on all four sides; the character occupies the middle",
    "two thirds and sits square to the frame.",
    CONSTRAINTS,
  ].join(" ");
}
