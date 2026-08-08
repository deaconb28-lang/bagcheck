/**
 * The icon vocabulary — pure, and free of node:crypto on purpose.
 *
 * <Icon> lives in components/primitives, which app/error.tsx pulls into a
 * client bundle, so anything it imports has to be bundleable for the browser.
 * The signing half is next door in noun.ts, which the client never touches.
 *
 * The vocabulary below is a closed allowlist, not a search box. Two reasons:
 * the API bills per call and an open proxy would spend the quota on whatever
 * anyone typed, and the Noun Project's terms forbid redistributing icons —
 * a route that fetched arbitrary terms on demand would be exactly that.
 */

/**
 * Every icon the product may ask for, mapped to the term it searches on.
 * Adding a screen glyph means adding a line here, on purpose.
 */
export const ICONS = {
  all: "list",
  buy: "buy",
  sell: "sell",
  dividend: "dividend",
  deposit: "deposit",
  withdrawal: "withdraw",
  other: "receipt",
} as const;

export type IconName = keyof typeof ICONS;

/**
 * Whether icons are available at all. It lives here rather than in fetch.ts
 * because fetch.ts imports the database, and a screen asking this question
 * must not drag Mongo into a bundle to get an answer.
 *
 * Server-side only — the key is not NEXT_PUBLIC and never should be, so a
 * client component would read undefined here and quietly lose its glyphs.
 */
export function iconsEnabled(): boolean {
  return Boolean(
    (process.env.NOUN_PROJECT_KEY || process.env.NOUN_PROJECT_API_KEY) &&
      (process.env.NOUN_PROJECT_SECRET || process.env.NOUN_PROJECT_API_SECRET),
  );
}

export function isIconName(value: string | null | undefined): value is IconName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ICONS, value);
}

/** The proxy URL a component points at. Names are allowlisted, so no escaping. */
export function iconSrc(name: IconName): string {
  return `/api/icon/${name}`;
}
