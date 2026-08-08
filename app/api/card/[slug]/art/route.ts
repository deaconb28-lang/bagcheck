import { cardArt, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

/**
 * A Wrapped card's generated backdrop.
 *
 * Public, like the card it belongs to, and served apart from the page so the
 * PNG does not ride inside the HTML. Immutable: the art is generated once at
 * mint and never changes for a given slug.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const png = isDbConfigured() ? await cardArt(slug) : null;
  if (!png) return new Response("Not found", { status: 404 });

  // Buffer is a Node type; Response wants a web body.
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
