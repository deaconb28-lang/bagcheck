import { fetchLogoPng, monogramSvg, normalizeSymbol } from "@/lib/logos";

export const runtime = "nodejs";

/** Clamped so a caller cannot ask logo.dev for an arbitrarily large render. */
const SIZES = [32, 48, 64, 128, 256];

/**
 * A ticker's mark, proxied.
 *
 * This route always answers with an image: the real logo when logo.dev has
 * one, and a drawn monogram in the product's palette when it does not. That
 * keeps the token server-side and means no component ever has to deal with a
 * broken image or a flash of fallback.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = normalizeSymbol(raw);
  if (!symbol) return new Response("Not found", { status: 404 });

  const asked = Number(new URL(req.url).searchParams.get("size")) || 64;
  const size = SIZES.reduce((best, s) =>
    Math.abs(s - asked) < Math.abs(best - asked) ? s : best,
  );

  const png = await fetchLogoPng(symbol, size);
  if (png) {
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        // Marks are stable; let the CDN and the browser hold them.
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  }

  // No mark, no token, or logo.dev was unreachable — draw our own. Cached far
  // more briefly so a later token fix or a newly added logo appears soon.
  return new Response(monogramSvg(symbol, size), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
