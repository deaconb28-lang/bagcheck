import { badgeBySlug, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

/*
 * The live, embeddable score badge — a self-contained SVG at a public URL,
 * for a Substack header or a personal site. It re-reads the score on every
 * cache miss and is cached for an hour: "live" means today's number, not a
 * websocket.
 *
 * An SVG at a URL carries no stylesheet, so — like the OG renderer — this
 * file repeats the palette. Keep the values in step with styles/tokens.css.
 */

const INK = "#fafafa";
const DIM = "#8c8c8c";
const FIELD = "#0d0d0d";
const EDGE = "rgba(255,255,255,0.14)";
const MOSS = "#4ade80";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const reading = isDbConfigured() ? await badgeBySlug(slug) : null;
  if (!reading) return new Response("Not found", { status: 404 });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="232" height="64" viewBox="0 0 232 64" role="img" aria-label="Supercruise Health ${reading.score}">
  <rect x="0.5" y="0.5" width="231" height="63" rx="15.5" fill="${FIELD}" stroke="${EDGE}"/>
  <circle cx="32" cy="32" r="17" fill="none" stroke="${EDGE}" stroke-width="3.5"/>
  <circle cx="32" cy="32" r="17" fill="none" stroke="${MOSS}" stroke-width="3.5"
    stroke-linecap="round" stroke-dasharray="${((reading.score / 100) * 106.8).toFixed(1)} 106.8"
    transform="rotate(-90 32 32)"/>
  <text x="62" y="28" font-family="system-ui,-apple-system,sans-serif" font-size="17" font-weight="700" fill="${INK}">${reading.score}<tspan fill="${DIM}" font-weight="500"> / 100</tspan></text>
  <text x="62" y="47" font-family="ui-monospace,Menlo,monospace" font-size="9.5" letter-spacing="1.4" fill="${DIM}">CANOPY HEALTH · ${reading.date}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      // An hour: fresh enough to be "live", cheap enough to embed anywhere.
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
