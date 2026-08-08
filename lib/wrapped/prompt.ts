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
  /** The card's colour family — the scene is lit to match its type. */
  hue?: "moss" | "ember" | "azure" | "violet";
}

/**
 * Each component gets a different natural motion — the art should feel like
 * the behaviour it came from rather than being interchangeable wallpaper.
 */
const MOTION: Record<WrappedYear["dominant"], string> = {
  adherence:
    "a vast mountain range in even parallel ridges receding to the horizon, seen head-on",
  consistency:
    "a long range of rolling peaks in a steady repeating rhythm, one after another to the horizon",
  patience:
    "a single enormous summit above a still sea of low cloud, everything below it quiet",
  exposure:
    "a dense crowd of jagged peaks pressing together toward one side of the frame",
};

/**
 * Where the light comes from. Each hue family gets its own, so a card's
 * scene and its type read as one object rather than as art with a UI on top.
 */
const LIGHT: Record<string, string> = {
  moss: "a low emerald-green sun breaking behind the peaks, cool jade sky above",
  ember: "a blazing orange sun low behind the peaks, deep red-black sky above",
  azure: "a cold blue dawn behind the peaks, deep navy sky above",
  violet: "a violet and magenta sunrise behind the peaks, deep indigo sky above",
};

/**
 * Things that would break the system if the model produced them. Stated as
 * plain prohibitions because that is what image models actually respect.
 */
const CONSTRAINTS = [
  "Absolutely no text, letters, numbers, words, digits or symbols anywhere in the image.",
  "No logos, charts, graphs, bars, arrows, coins, currency or financial iconography.",
  "No people, faces, hands, animals, buildings, roads or vehicles.",
  "Landscape only: rock, sky, cloud, light.",
].join(" ");

/**
 * The palette, stated in words. These match the --share-* tokens the card is
 * drawn on, so the art sits under the type instead of fighting it.
 */
/**
 * The scene has to be dark where the type sits and bright where it does not.
 * Stated as composition rather than as colour, because a model follows "the
 * top third is empty sky" and ignores "leave room for a headline".
 */
const COMPOSITION =
  "Cinematic vertical composition, 2:3 portrait. " +
  "The top third is empty, near-black sky with nothing in it. " +
  "The horizon and the light sit in the lower half. " +
  "Deep saturated colour, high contrast, dramatic rim light on the peaks. " +
  "Digital matte painting, poster art, clean and graphic rather than photographic.";

export function artPrompt(year: WrappedYear): string {
  const subject = MOTION[year.dominant];
  const light = LIGHT[year.hue ?? "moss"] ?? LIGHT.moss;
  const hold =
    year.longestHold && year.longestHold >= 180
      ? "The scene should feel still and unhurried, one shape held for a long time."
      : "";

  return [
    `A dramatic landscape for the lower half of a poster: ${subject}.`,
    `${light}.`,
    hold,
    COMPOSITION,
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
