import { monogram, toneIndex } from "./logo";
import { isLogoResponse, logoSources } from "./sources";

/**
 * The one place that talks to a logo provider.
 *
 * Shared by the /api/logo proxy and by the share-card image renderer, so a
 * card and a screen always resolve a symbol the same way. The store in
 * `lib/db/logos.ts` sits in front of this — nothing here caches, and nothing
 * here reaches the database.
 */

/**
 * The token is a logo.dev API key. `LOGO_DEV_TOKEN` is canonical; the two
 * aliases are accepted because the same key gets named a few different ways
 * in practice and a mismatch would silently drop the first source.
 *
 * **`NEXT_PUBLIC_LOGO_DEV_TOKEN` is deliberately not among them.** It used to
 * be, and it was a trap: Next inlines any `NEXT_PUBLIC_` variable into the
 * client bundle, so accepting that spelling invited someone to set a secret
 * under a name that publishes it. Reading the token at all is the reason
 * `/api/logo/[symbol]` exists — the key stays on this side and the browser
 * only ever sees an image.
 *
 * It is optional. Two of the three sources need no key, so an unset token
 * costs one link in the chain rather than the feature.
 */
export function logoToken(): string | null {
  return (
    process.env.LOGO_DEV_TOKEN ||
    process.env.LOGODEV_TOKEN ||
    process.env.LOGO_DEV_API_KEY ||
    null
  );
}

export interface FetchedLogo {
  bytes: ArrayBuffer;
  /** Echoed back by the proxy, so a source serving webp is served as webp. */
  type: string;
  /** Which link answered. Stored, so a bad source is traceable later. */
  source: string;
}

/**
 * Walk the chain until one source answers with an actual mark.
 *
 * A source that errors, times out or hands back a placeholder is not a
 * failure — it is the next source's turn. Only the end of the chain is a
 * miss, and a miss means the caller draws our monogram.
 */
export async function fetchLogo(
  symbol: string,
  size = 64,
): Promise<FetchedLogo | null> {
  for (const source of logoSources(symbol, size, logoToken())) {
    try {
      const res = await fetch(source.url, {
        // A mark is small; a source that cannot answer quickly is a source we skip.
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 86_400 },
      });

      if (!res.ok) {
        if (res.status === 401 && source.name === "logo.dev") {
          console.error("[logos] logo.dev rejected the token");
        }
        continue;
      }

      const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
      const bytes = await res.arrayBuffer();
      if (!isLogoResponse(type, bytes.byteLength)) continue;

      return { bytes, type, source: source.name };
    } catch (err) {
      console.error("[logos] source failed", source.name, symbol, err);
    }
  }

  return null;
}

/** The bytes alone, for callers that only ever wanted an image. */
export async function fetchLogoPng(
  symbol: string,
  size = 64,
): Promise<ArrayBuffer | null> {
  return (await fetchLogo(symbol, size))?.bytes ?? null;
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
 *
 * This is for a ticker no source has a mark for — a delisted name, a foreign
 * listing, a cash line that slipped through. It is not the house style, and a
 * screen full of these means the chain is failing, not that the design is
 * working.
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
