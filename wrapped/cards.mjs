/**
 * The twelve cards, declared once.
 *
 * The generator reads it for motifs, the template builder reads it for tokens
 * and titles, the personaliser reads it for the fallback caption bank, and the
 * validator reads it to know which tokens a card is allowed to carry. A table
 * that lives in one file cannot drift against itself; twelve files each
 * carrying their own idea of what card 07 is about would.
 *
 * Plain `.mjs` with no imports so a build script, a Node test and the Next
 * runtime can all read it without a bundler in the way.
 */

/**
 * Identical across all twelve, so the set reads as one story rather than as
 * twelve pictures that happen to share a palette.
 *
 * The no-text clause is load-bearing rather than stylistic: image models
 * garble letterforms, and every figure on a Canopy card is a number that
 * came off a brokerage. Typography lives in the HTML layer, where it stays
 * crisp, brand-controlled, and — the part that matters — correct.
 */
/*
 * What every card shares — and it is deliberately only two things.
 *
 * It used to be a whole style: "near-black deep canvas, luminous grainy
 * gradients, cinematic depth", which is why twelve cards came back looking
 * like one card twelve times. A Wrapped deck is chaotic on purpose — the
 * pleasure of flicking through it is that the next one looks nothing like the
 * last. So the medium, the texture and the palette now live per card in
 * `art`, and what stays shared is the two rules that are about legibility
 * rather than taste.
 */

/** Where the type goes. A model follows a composition, not "leave room". */
export const COMPOSITION =
  "Vertical 2:3 portrait poster art. Keep the centre and the lower third " +
  "visually quiet and uncluttered so text can sit over it. Put the incident " +
  "and the detail in the upper half.";

/**
 * The prohibitions, stated plainly because that is what image models respect.
 * Load-bearing rather than fussy: every figure on a Wrapped card is set in
 * type by us, and a number a model drew is a number nobody can correct on an
 * artefact whose whole claim is that it came off a brokerage.
 */
export const CONSTRAINTS =
  "Absolutely no text, letters, numbers, digits, words or symbols anywhere. " +
  "No charts, graphs, candlesticks, arrows, coins or financial iconography. " +
  "No logos, no people, no faces, no hands.";

/**
 * @typedef {Object} WrappedCardDef
 * @property {string} no      Two digits. The file name, the frame number, the order.
 * @property {string} key     Stable slug, used in caches and logs.
 * @property {string} title   The card's own heading, set in the template.
 * @property {string} motif   The subject this card's art is of.
 * @property {{medium: string, texture: string, palette: string}} art
 *   The card's own art direction. Twelve different ones on purpose — a deck is
 *   chaotic, and a shared style is one card printed twelve times.
 * @property {string[]} tokens Every {{TOKEN}} the template carries, minus CAPTION.
 * @property {string} hero    The token set enormous. One per card.
 * @property {string} teaser  The drawing an unearned frame wears. A `TeaserKind`.
 * @property {string} requires The one condition that mints it. A requirement, never a figure.
 * @property {string[]} fallbackCaptions Three, written to the same tone rules.
 */

/** @type {WrappedCardDef[]} */
export const CARDS = [
  {
    no: "01",
    key: "cover",
    title: "Your year, all of it",
    motif: "one enormous chrome droplet suspended in a void, warping the light around it",
    art: {
      medium: "iridescent liquid chrome, a molten metal blob rendered in 3D with mirror-sharp reflections and razor highlights",
      texture: "glossy, zero grain, hard specular edges",
      palette: "acid lime, hot magenta and mercury silver on pure black",
    },
    tokens: ["USER_NAME", "YEAR"],
    hero: "YEAR",
    teaser: "cardFan",
    requires: "a synced brokerage",
    fallbackCaptions: [
      "Here is your year, read straight off your brokerage.",
      "Twelve cards, all of them yours.",
      "Your year, in the numbers you actually made.",
    ],
  },
  {
    no: "02",
    key: "return",
    title: "The year in one number",
    motif: "one vast beam driven diagonally across the sheet, the two inks overlapping where it crosses",
    art: {
      medium: "risograph print, two ink layers slightly mis-registered",
      texture: "coarse paper tooth, visible dot screen, ink bleeding at the edges",
      palette: "fluorescent orange and electric blue on unbleached newsprint",
    },
    tokens: ["TOTAL_RETURN_PCT"],
    hero: "TOTAL_RETURN_PCT",
    teaser: "equity",
    requires: "30 days of account value",
    fallbackCaptions: [
      "Your whole year, as one figure.",
      "Everything you did, added up.",
      "One number for twelve months of decisions.",
    ],
  },
  {
    no: "03",
    key: "contributions",
    title: "What you put in",
    motif: "a staircase of stacked paper rectangles climbing out of the bottom edge",
    art: {
      medium: "cut-paper collage, matte construction paper layered in physical planes with real drop shadows",
      texture: "torn fibrous edges, flat unlit colour, no gradient anywhere",
      palette: "terracotta, olive, cream and burnt mustard",
    },
    tokens: ["CONTRIBUTION_COUNT", "CONTRIBUTION_STREAK_WEEKS"],
    hero: "CONTRIBUTION_COUNT",
    teaser: "cadence",
    requires: "one contribution on the ledger",
    fallbackCaptions: [
      "You kept showing up, week after week.",
      "Every one of these was a decision you made.",
      "Steady beats dramatic, and this is steady.",
    ],
  },
  {
    no: "04",
    key: "longestHold",
    title: "The longest hold",
    motif: "a single slow curtain of light hanging from the top of the frame, still and unhurried",
    art: {
      medium: "deep gradient mesh, smooth volumetric fog with no visible edges",
      texture: "glassy and continuous, faint chromatic bloom, no grain",
      palette: "aurora teal fading through indigo into deep violet",
    },
    tokens: ["LONGEST_HOLD_TICKER", "LONGEST_HOLD_DAYS"],
    hero: "LONGEST_HOLD_DAYS",
    teaser: "hold",
    requires: "a position held 30 days",
    fallbackCaptions: [
      "You held this one longer than anything else.",
      "Patience, measured in days.",
      "This one stayed with you all year.",
    ],
  },
  {
    no: "05",
    key: "best",
    title: "Best performer",
    motif: "one huge starburst exploding from a single point, dots enlarging outward",
    art: {
      medium: "halftone pop-art print, oversized Ben-Day dots at screen-print scale",
      texture: "hard-edged dots, visible registration, flat comic-book ink",
      palette: "hot pink and cyan on canary yellow",
    },
    tokens: ["BEST_TICKER", "BEST_RETURN_PCT"],
    hero: "BEST_RETURN_PCT",
    teaser: "records",
    requires: "one round trip closed green",
    fallbackCaptions: [
      "Your strongest name of the year.",
      "This one did the heavy lifting.",
      "The pick that worked hardest for you.",
    ],
  },
  {
    no: "06",
    key: "heldThrough",
    title: "The one you held through",
    motif: "a deep cold trough with one furious hot ridge along its far edge",
    art: {
      medium: "thermal infrared imaging, a heat bloom read by a sensor",
      texture: "smooth isotherm banding, sensor noise in the cold areas",
      palette: "cold indigo through magenta to white-hot core",
    },
    tokens: ["MAX_DRAWDOWN_PCT", "RECOVERY_DAYS"],
    hero: "MAX_DRAWDOWN_PCT",
    teaser: "eventWindow",
    requires: "a 10% drawdown you did not sell",
    fallbackCaptions: [
      "You sat through this one and came out the far side.",
      "The dip you did not sell into.",
      "Held, all the way through and back.",
    ],
  },
  {
    no: "07",
    key: "busiest",
    title: "Most active month",
    motif: "a dense field of light points tearing horizontally as the signal breaks",
    art: {
      medium: "CRT phosphor screen, scanlines and signal glitch, datamosh tearing",
      texture: "horizontal scanline banding, chromatic fringing, analogue noise",
      palette: "phosphor green and electric cyan on near-black",
    },
    tokens: ["BUSIEST_MONTH", "TRADE_COUNT_YEAR"],
    hero: "TRADE_COUNT_YEAR",
    teaser: "months",
    requires: "one month with trades in it",
    fallbackCaptions: [
      "Your busiest stretch of the whole year.",
      "This was the month you were paying attention.",
      "More happened here than anywhere else.",
    ],
  },
  {
    no: "08",
    key: "redDays",
    title: "Buying on red days",
    motif: "scattered ink drops blooming and stretching into long marbled veins",
    art: {
      medium: "suminagashi marbled ink floated on water and lifted onto paper",
      texture: "fine concentric ink rings, wet feathered edges, bone paper grain",
      palette: "crimson and deep oxblood swirled through bone white",
    },
    tokens: ["RED_DAY_BUYS"],
    hero: "RED_DAY_BUYS",
    teaser: "sessionSize",
    requires: "a buy on a day your book was down",
    fallbackCaptions: [
      "You bought while the screen was red.",
      "Green days are easy. These were not.",
      "Every one of these took some nerve.",
    ],
  },
  {
    no: "09",
    key: "mix",
    title: "Your mix",
    motif: "irregular stone chips of many sizes scattered evenly across the whole slab",
    art: {
      medium: "terrazzo, polished stone chips set in flat resin, shot straight on",
      texture: "hard chip edges, matte polished surface, completely flat lighting",
      palette: "mint, coral, butter yellow and slate on off-white",
    },
    tokens: ["TOP_SECTOR", "TOP_SECTOR_PCT", "HOLDINGS_COUNT"],
    hero: "TOP_SECTOR_PCT",
    teaser: "components",
    requires: "sector data for what you hold",
    fallbackCaptions: [
      "This is where your money actually sits.",
      "Your book, by where it leans.",
      "The shape of what you own.",
    ],
  },
  {
    no: "10",
    key: "vsIndex",
    title: "You and the index",
    motif: "two long ruled lines converging toward a marked vanishing point",
    art: {
      medium: "technical blueprint, drafting linework on coated paper",
      texture: "fine ruled grid, faint plotter ink bleed, paper fibre",
      palette: "pale cyan and chalk line on deep prussian navy",
    },
    tokens: ["VS_SPY_PCT"],
    hero: "VS_SPY_PCT",
    teaser: "percentile",
    requires: "30 days of account value",
    fallbackCaptions: [
      "You and the index, side by side.",
      "Your year, measured against the market's.",
      "Here is where you landed next to the benchmark.",
    ],
  },
  {
    no: "11",
    key: "archetype",
    title: "Your archetype",
    motif: "a lone abstract figure-like silhouette standing centred against banded sky",
    art: {
      medium: "airbrushed 1970s poster art, soft banded sky, heavy vignette",
      texture: "velvety airbrush gradients, subtle film grain, no hard edges",
      palette: "amber, rose and deep purple in horizontal bands",
    },
    tokens: ["ARCHETYPE_NAME", "ARCHETYPE_TRAIT"],
    hero: "ARCHETYPE_NAME",
    teaser: "archetypes",
    requires: "one scored day",
    fallbackCaptions: [
      "This is what your own record reads like.",
      "Twelve months of decisions, given a name.",
      "Your conduct, in one word.",
    ],
  },
  {
    no: "12",
    key: "share",
    title: "The card you share",
    motif: "overlapping foil shapes catching the light at different angles",
    art: {
      medium: "holographic foil sticker sheet photographed under raking light",
      texture: "rainbow diffraction, glossy foil creases, die-cut edges",
      palette: "silver holographic shifting through pink, cyan and gold",
    },
    tokens: ["TOTAL_RETURN_PCT", "LONGEST_HOLD_DAYS", "ARCHETYPE_NAME", "INVESTOR_AGE"],
    hero: "TOTAL_RETURN_PCT",
    teaser: "stamp",
    requires: "every other card in the set",
    fallbackCaptions: [
      "Your year, on one card.",
      "The short version, worth posting.",
      "Everything above, in a single frame.",
    ],
  },
];

/** Every token the twelve cards use between them. */
export const ALL_TOKENS = [...new Set(CARDS.flatMap((c) => c.tokens))].sort();

/** The card the personaliser and the validator look up by number. */
export function cardByNo(no) {
  return CARDS.find((c) => c.no === no) ?? null;
}
