import { BLANK_SVG, getIcon, isIconName } from "@/lib/icons";

export const runtime = "nodejs";

/**
 * An icon, proxied.
 *
 * The path segment is a name from the allowlist, never a search term: the
 * route must not become a way to pull arbitrary icons through our quota, and
 * the Noun Project's terms forbid redistributing their library.
 *
 * It always answers with an SVG. When there is no key, no match, or the API
 * is down, that SVG is transparent — so a component never has to handle a
 * broken icon and the layout does not move.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!isIconName(name)) return new Response("Not found", { status: 404 });

  const icon = await getIcon(name);

  return new Response(icon?.svg ?? BLANK_SVG, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Only cache hard once there is something real to cache. A blank is
      // held briefly so a later key fix shows up without a purge.
      "Cache-Control": icon
        ? "public, max-age=86400, s-maxage=604800, immutable"
        : "public, max-age=300",
      // Painted as a mask or an <img>, both of which disable script — this
      // is the belt for anyone who opens the URL directly.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
