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
 * Everything the Wrapped backdrop forbids is forbidden here for the same
 * reason, plus one more: an avatar sits beside a person's name, and a
 * generated face there would be a claim about who they are.
 */

const CONSTRAINTS = [
  "No text, letters, numbers, words or symbols of any kind.",
  "No logos, charts, arrows, coins, currency or financial iconography.",
  "No people, faces, hands, animals or recognisable objects.",
  "Fully abstract. Flat and matte — no gloss, glare, bevel, metal, drop shadow or 3D shading.",
  "No pure white and no pure black; the whole image stays dark and even.",
  "One centred form on an empty field. No border, no frame, no vignette.",
].join(" ");

/**
 * The palette in words, matching the `--share-*` tokens the avatar is drawn
 * on so a generated mark and a drawn one sit on the same field.
 */
const PALETTE =
  "Very dark warm near-black background, close to #17140F. " +
  "The form itself in muted sage green (#4FB287), at low saturation, " +
  "like dye seen through dark glass. No third colour.";

export function avatarPrompt(archetype: Archetype): string {
  return [
    `A single abstract emblem, drawn as a flat matte mark on a dark field: ${archetype.emblem}.`,
    "Even stroke weight throughout, as if drawn with one pen at one width.",
    "Generous empty margin on all four sides; the form occupies the middle two thirds.",
    PALETTE,
    "Soft paper grain, like a risograph print on dark stock.",
    CONSTRAINTS,
  ].join(" ");
}
