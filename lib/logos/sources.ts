/**
 * Where a company mark comes from, and in what order.
 *
 * Every logo in the product used to come from logo.dev, which needs an API
 * key — so the whole feature was one environment variable away from silently
 * degrading, and it did: with `LOGO_DEV_TOKEN` unset on the deployment, every
 * holding, every ledger row and every share card rendered a drawn monogram.
 * The monogram is a fallback for a ticker nobody has a mark for, not the
 * house style, and a table of two-letter tiles is what an unconfigured app
 * looks like.
 *
 * So the mark now comes from a chain, and only the first link needs a key.
 * Financial Modeling Prep and parqet both serve ticker logos without one,
 * which means a fresh clone with an empty `.env` renders real logos — the
 * same rule the rest of the integrations follow, where a missing key costs a
 * feature rather than the page.
 *
 * Everything here is pure: the URLs and the "is this actually a logo" test.
 * fetch.ts walks the chain.
 */

/** The ordered chain, expressed once. */
export interface LogoSource {
  /** Recorded on the stored document, so a bad source is traceable later. */
  name: string;
  url: string;
}

/**
 * Below this a response is a placeholder, not a mark.
 *
 * Both keyless sources answer an unknown ticker with a body rather than a
 * 404 — parqet with nothing at all, FMP with 22 bytes — while the real marks
 * they serve start around 380 bytes. A status code is not enough to tell them
 * apart, so the size is part of the test.
 */
export const MIN_LOGO_BYTES = 200;

export function logoSources(
  symbol: string,
  size: number,
  token: string | null,
): LogoSource[] {
  const t = encodeURIComponent(symbol);
  const chain: LogoSource[] = [];

  /*
   * logo.dev first when there is a key: it is the only one that renders at a
   * requested size, and `fallback=404` asks it not to substitute a monogram
   * of its own — an unknown ticker should fall through to ours, drawn in this
   * product's palette rather than someone else's.
   */
  if (token) {
    chain.push({
      name: "logo.dev",
      url:
        `https://img.logo.dev/ticker/${t}` +
        `?token=${encodeURIComponent(token)}&size=${size}&format=png&fallback=404`,
    });
  }

  chain.push({
    name: "fmp",
    url: `https://financialmodelingprep.com/image-stock/${t}.png`,
  });

  chain.push({
    name: "parqet",
    url: `https://assets.parqet.com/logos/symbol/${t}?format=png&size=${size}`,
  });

  return chain;
}

/**
 * Whether a response is a mark we can serve.
 *
 * An image content type and enough bytes to be a drawing. Anything else —
 * an HTML error page with a 200 on it, a one-pixel spacer, an empty body —
 * is a miss, and a miss must fall to the next source rather than be stored.
 */
export function isLogoResponse(contentType: string | null, bytes: number): boolean {
  if (bytes < MIN_LOGO_BYTES) return false;
  return Boolean(contentType && contentType.trim().toLowerCase().startsWith("image/"));
}

/**
 * How long a miss is trusted before the chain is walked again.
 *
 * Icons never expire because the vocabulary is fixed and an icon does not
 * change. Tickers are neither: a company that has no mark today may have one
 * next month, and a newly listed symbol certainly will. A week is short
 * enough that a new listing fills in on its own and long enough that an
 * obscure holding does not call three third parties on every page view.
 */
export const MISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function missIsStale(fetchedAt: Date, now = new Date()): boolean {
  return now.getTime() - fetchedAt.getTime() > MISS_TTL_MS;
}
