import { logoFor } from "@/lib/db";
import { monogramSvg, normalizeSymbol } from "@/lib/logos";

export const runtime = "nodejs";

/** Clamped so a caller cannot ask a provider for an arbitrarily large render. */
const SIZES = [32, 48, 64, 128, 256];

/**
 * A ticker's mark, proxied.
 *
 * This route always answers with an image: the real logo when any source in
 * the chain has one, and a drawn monogram when none does. That keeps the
 * logo.dev token server-side and means no component ever has to deal with a
 * broken image or a flash of fallback.
 *
 * The mark itself is resolved through the store, so the first render of a
 * symbol pays the round trip and every render after it does not.
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

  const logo = await logoFor(symbol, size);
  if (logo) {
    return new Response(new Uint8Array(logo.bytes), {
      headers: {
        "Content-Type": logo.type,
        // Marks are stable; let the CDN and the browser hold them.
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  }

  // No source has a mark for this ticker — draw our own. Cached far more
  // briefly, so a symbol that gets a logo later appears without a deploy.
  return new Response(monogramSvg(symbol, size), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
