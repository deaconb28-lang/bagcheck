import { monogram, toneIndex } from "./logo";

/**
 * The one place that talks to logo.dev.
 *
 * Shared by the /api/logo proxy and by the share-card image renderer, so a
 * card and a screen always resolve a symbol the same way.
 */

/**
 * The token is a logo.dev API key. `LOGO_DEV_TOKEN` is canonical; the aliases
 * are accepted because the same key gets named a few different ways in
 * practice and a mismatch would silently render every logo as a monogram.
 */
export function logoToken(): string | null {
  return (
    process.env.LOGO_DEV_TOKEN ||
    process.env.LOGODEV_TOKEN ||
    process.env.LOGO_DEV_API_KEY ||
    process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN ||
    null
  );
}

export function isLogosConfigured(): boolean {
  return Boolean(logoToken());
}

/**
 * Fetch a ticker's mark as PNG bytes, or null when there isn't one.
 *
 * `fallback=404` asks logo.dev not to substitute its own monogram: an unknown
 * ticker should fall through to ours, drawn in this product's palette.
 */
export async function fetchLogoPng(
  symbol: string,
  size = 64,
): Promise<ArrayBuffer | null> {
  const token = logoToken();
  if (!token) return null;

  const url =
    `https://img.logo.dev/ticker/${encodeURIComponent(symbol)}` +
    `?token=${encodeURIComponent(token)}&size=${size}&format=png&fallback=404`;

  try {
    const res = await fetch(url, {
      // Marks change rarely; a day of edge cache keeps this off the hot path.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      if (res.status === 401) {
        console.error("[logos] logo.dev rejected the token");
      }
      return null;
    }
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    return await res.arrayBuffer();
  } catch (err) {
    console.error("[logos] fetch failed", symbol, err);
    return null;
  }
}

/*
 * Tile palette for the monogram fallback. Standalone image responses render
 * with no stylesheet and no custom properties, so — like the share-card
 * renderer — this file repeats the palette. Keep it in step with the tones in
 * Logo.module.css: same six entries, same order.
 */
export const TILE = [
  { bg: "#1A1A1A", fg: "#FAFAFA" },
  { bg: "#141414", fg: "#D6D6D6" },
  { bg: "#1F1F1F", fg: "#FFFFFF" },
  { bg: "#171717", fg: "#C2C2C2" },
  { bg: "#101010", fg: "#E8E8E8" },
  { bg: "#1C1C1C", fg: "#B0B0B0" },
];

/**
 * The fallback mark, drawn rather than fetched: initials on a flat tile, in
 * the product's own palette. Returned as SVG so the proxy always answers with
 * an image and a component never has to handle a broken one.
 */
export function monogramSvg(symbol: string, size = 64): string {
  const { bg, fg } = TILE[toneIndex(symbol, TILE.length)];
  const text = monogram(symbol);
  const fontSize = text.length > 1 ? size * 0.36 : size * 0.46;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${text}">`,
    `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/>`,
    `<text x="50%" y="50%" dy="0.02em" text-anchor="middle" dominant-baseline="central"`,
    ` font-family="Outfit, ui-sans-serif, system-ui, sans-serif" font-weight="700"`,
    ` font-size="${fontSize.toFixed(1)}" letter-spacing="-0.02em" fill="${fg}">${text}</text>`,
    `</svg>`,
  ].join("");
}
