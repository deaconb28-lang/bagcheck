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
 * The avatar is lit like the Wrapped card it sits on: a luminous emblem on a
 * deep field, with light behind it. The first set was flat matte line art,
 * which was right for the old flat card and looks like a placeholder next to
 * the new one. An avatar that whispers beside a poster is a bug.
 *
 * Everything the Wrapped backdrop forbids is forbidden here for the same
 * reason, plus one more: an avatar sits beside a person's name, and a
 * generated face there would be a claim about who they are.
 */

const CONSTRAINTS = [
  "Absolutely no text, letters, numbers, words, digits or symbols anywhere.",
  "No logos, charts, arrows, coins, currency or financial iconography.",
  "No people, faces, hands, animals, plants or recognisable objects.",
  "Fully abstract geometry. One centred form and nothing else.",
  "No border, no frame, no vignette, no drop shadow, no bevelled or chrome metal.",
].join(" ");

/**
 * The light behind the form, per hue family. Named after the `--card-*`
 * families so an avatar and the card it sits on read as one object.
 */
const GLOW: Record<string, string> = {
  moss: "emerald green (#57D69D) light",
  ember: "warm amber-orange (#FF9B45) light",
  azure: "cold blue (#62B0F5) light",
  violet: "violet-magenta (#B48BFF) light",
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
  const glow = GLOW[avatarHue(archetype)];
  return [
    `A single luminous emblem, centred on a deep near-black field: ${archetype.emblem}.`,
    `The form glows with ${glow}, brightest at its core and falling off into the dark.`,
    "Even stroke weight throughout, as if cut from one ribbon of light at one width.",
    "A soft halo of the same colour behind the form; the corners of the frame stay near-black.",
    "Generous empty margin on all four sides; the form occupies the middle two thirds.",
    "Crisp, graphic, poster-like. Fine grain over the whole image.",
    CONSTRAINTS,
  ].join(" ");
}
