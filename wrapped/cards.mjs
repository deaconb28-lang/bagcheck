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
 * garble letterforms, and every figure on a Bagcheck card is a number that
 * came off a brokerage. Typography lives in the HTML layer, where it stays
 * crisp, brand-controlled, and — the part that matters — correct.
 */
export const STYLE_PREFIX =
  "Abstract premium background art for a mobile story card, portrait " +
  "orientation, near-black deep canvas, luminous grainy gradients, subtle " +
  "film-grain texture, cinematic depth, generous empty space in the center " +
  "and lower third for text overlay. Absolutely no text, no letters, no " +
  "numbers, no charts, no candlesticks, no logos, no people.";

/**
 * @typedef {Object} WrappedCardDef
 * @property {string} no      Two digits. The file name, the frame number, the order.
 * @property {string} key     Stable slug, used in caches and logs.
 * @property {string} title   The card's own heading, set in the template.
 * @property {string} motif   Appended to STYLE_PREFIX for this card's art.
 * @property {string[]} tokens Every {{TOKEN}} the template carries, minus CAPTION.
 * @property {string} hero    The token set enormous. One per card.
 * @property {string[]} fallbackCaptions Three, written to the same tone rules.
 */

/** @type {WrappedCardDef[]} */
export const CARDS = [
  {
    no: "01",
    key: "cover",
    title: "Your 2026, checked",
    motif: "a slow aurora unfurling from the bottom edge",
    tokens: ["USER_NAME", "YEAR"],
    hero: "YEAR",
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
    motif: "a single vertical beam of light splitting the darkness",
    tokens: ["TOTAL_RETURN_PCT"],
    hero: "TOTAL_RETURN_PCT",
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
    motif: "ascending translucent steps catching light",
    tokens: ["CONTRIBUTION_COUNT", "CONTRIBUTION_STREAK_WEEKS"],
    hero: "CONTRIBUTION_COUNT",
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
    motif: "a small bright body in slow orbit around a dark mass",
    tokens: ["LONGEST_HOLD_TICKER", "LONGEST_HOLD_DAYS"],
    hero: "LONGEST_HOLD_DAYS",
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
    motif: "a solar flare cresting a dark horizon",
    tokens: ["BEST_TICKER", "BEST_RETURN_PCT"],
    hero: "BEST_RETURN_PCT",
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
    motif: "a deep wave trough with light breaking at the far edge",
    tokens: ["MAX_DRAWDOWN_PCT", "RECOVERY_DAYS"],
    hero: "MAX_DRAWDOWN_PCT",
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
    motif: "a pulsing grid of soft light points",
    tokens: ["BUSIEST_MONTH", "TRADE_COUNT_YEAR"],
    hero: "TRADE_COUNT_YEAR",
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
    motif: "scattered embers glowing against the dark",
    tokens: ["RED_DAY_BUYS"],
    hero: "RED_DAY_BUYS",
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
    motif: "layered geological strata in muted luminous bands",
    tokens: ["TOP_SECTOR", "TOP_SECTOR_PCT", "HOLDINGS_COUNT"],
    hero: "TOP_SECTOR_PCT",
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
    motif: "two horizon lines converging at a vanishing point",
    tokens: ["VS_SPY_PCT"],
    hero: "VS_SPY_PCT",
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
    motif: "a constellation forming a subtle figure",
    tokens: ["ARCHETYPE_NAME", "ARCHETYPE_TRAIT"],
    hero: "ARCHETYPE_NAME",
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
    motif: "the full gradient spectrum of cards 1 through 11 blended into one field",
    tokens: ["TOTAL_RETURN_PCT", "LONGEST_HOLD_DAYS", "ARCHETYPE_NAME", "INVESTOR_AGE"],
    hero: "TOTAL_RETURN_PCT",
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
