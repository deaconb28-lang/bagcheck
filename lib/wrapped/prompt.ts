/**
 * The prompt for a Wrapped card's artwork — pure, so what gets asked for is
 * testable without spending anything.
 *
 * Wrapped is one of the two moments the product is allowed to make beautiful.
 * Everywhere else stays flat and matte, so this art is a *backdrop* behind the
 * ink field, never illustration on top of it, and never the thing carrying the
 * meaning. The number and the sentence are still set in Outfit by us.
 */

export interface WrappedYear {
  year: number;
  /** The archetype the score named — the year in two or three words. */
  archetype: string;
  /** Their strongest component, which is what the year was actually about. */
  dominant: "adherence" | "consistency" | "patience" | "exposure";
  scoredDays: number;
  /** Longest hold in days, when there is one worth naming. */
  longestHold: number | null;
}

/**
 * Each component gets a different natural motion — the art should feel like
 * the behaviour it came from rather than being interchangeable wallpaper.
 */
const MOTION: Record<WrappedYear["dominant"], string> = {
  adherence: "long parallel strata, very evenly spaced, almost geological",
  consistency: "a slow repeating wave with an unusually regular period",
  patience: "wide still bands, like sediment settled over a long time",
  exposure: "layered ridges that crowd together toward one edge",
};

/**
 * Things that would break the system if the model produced them. Stated as
 * plain prohibitions because that is what image models actually respect.
 */
const CONSTRAINTS = [
  "No text, letters, numbers, words or symbols of any kind.",
  "No logos, charts, graphs, arrows, coins, currency or financial iconography.",
  "No people, faces, hands, animals or recognisable objects.",
  "Fully abstract. Flat and matte, with no gloss, glare, bevel, metal or 3D shading.",
  "No harsh white highlights and no pure black; keep the whole image dark and even.",
].join(" ");

/**
 * The palette, stated in words. These match the --share-* tokens the card is
 * drawn on, so the art sits under the type instead of fighting it.
 */
const PALETTE =
  "Very dark warm near-black background, close to #17140F. " +
  "Muted sage green (#4FB287) and dusty slate blue (#7BA6C4) used sparingly, " +
  "at low saturation and low contrast, like dye seen through dark glass.";

export function artPrompt(year: WrappedYear): string {
  const subject = MOTION[year.dominant];
  const hold =
    year.longestHold && year.longestHold >= 180
      ? " The composition should feel unhurried and horizontal, holding one shape for a long time."
      : "";

  return [
    `An abstract dark texture for the background of a card: ${subject}.`,
    hold.trim(),
    PALETTE,
    "Soft grain, like matte paper stock or a risograph print.",
    "The centre and lower half must stay quiet and uncluttered, because text will be placed over them.",
    CONSTRAINTS,
  ]
    .filter(Boolean)
    .join(" ");
}

/** What the card says, given the year. Separate from the art on purpose. */
export function wrappedTail(year: WrappedYear): string {
  return `${year.scoredDays} scored days as ${article(year.archetype)} ${year.archetype.toLowerCase()}`;
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}
