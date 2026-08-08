/**
 * Company marks for tickers, via logo.dev.
 *
 * Everything here is pure. The network lives in fetch.ts, and the token never
 * leaves the server — logos are proxied through /api/logo so the key is not
 * pasted into hundreds of image URLs in the DOM.
 */

/** A ticker we can actually ask about: letters, digits, dot and dash only. */
export function normalizeSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  // Cash rows, transfers and unparsed types come through as an em dash.
  if (!s || s === "—" || s === "-") return null;
  if (!/^[A-Z0-9.\-]{1,12}$/.test(s)) return null;
  return s;
}

/** Two characters, because a tile this small cannot hold more. */
export function monogram(symbol: string): string {
  const clean = symbol.replace(/[^A-Z0-9]/g, "");
  return (clean.slice(0, 2) || "?").toUpperCase();
}

/**
 * Deterministic tile colour, so a symbol is the same colour on every screen.
 * Indexes into the palette in fetch.ts / Logo.module.css — both carry the
 * same six entries in the same order.
 */
export function toneIndex(symbol: string, buckets = 6): number {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i += 1) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % buckets;
}

/** The proxy URL a component points an <img> at. */
export function logoSrc(symbol: string, size = 64): string {
  return `/api/logo/${encodeURIComponent(symbol)}?size=${size}`;
}
