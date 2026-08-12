import { NextResponse, type NextRequest } from "next/server";
import { QUERIES, photosEnabled, refreshPhotos } from "@/lib/unsplash";
import type { CardKind } from "@/lib/cards";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Fills the photograph store — the one place in the product that calls
 * Unsplash.
 *
 * Rendering a page only ever reads the store, so no amount of traffic can
 * spend quota. Filling it is a deliberate act, which is why this is a POST
 * behind `PHOTOS_REFRESH_TOKEN` and not something a deploy or a first visitor
 * triggers: re-running it re-picks the photograph for every kind, and cards
 * people have already posted change underneath them.
 *
 * `npm run photos` does the same thing from a shell. This route exists because
 * the key lives in the deployment, and the store it writes to lives beside it.
 *
 *   curl -X POST https://…/api/photos/refresh \
 *     -H "Authorization: Bearer $PHOTOS_REFRESH_TOKEN"
 *
 * Without the token set, the route does not exist — an admin action with no
 * secret configured is an open one.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PHOTOS_REFRESH_TOKEN;
  if (!secret) return new Response("Not found", { status: 404 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!photosEnabled()) {
    return NextResponse.json({ error: "UNSPLASH_ACCESS_KEY is not set" }, { status: 503 });
  }

  const all = Object.keys(QUERIES) as CardKind[];
  /*
   * A body may name a subset, so one kind can be re-picked without disturbing
   * the twelve that are already worn. Anything unrecognised is dropped rather
   * than passed through — the query list is the allowlist, the same way the
   * icon route takes names and never search terms.
   */
  const asked = await req.json().catch(() => null);
  const wanted: CardKind[] = Array.isArray(asked?.kinds)
    ? all.filter((k) => asked.kinds.includes(k))
    : all;

  const stored = await refreshPhotos(wanted);

  return NextResponse.json({
    asked: wanted.length,
    stored: stored.length,
    photos: stored.map((p) => ({ kind: p.kind, credit: p.creditName })),
  });
}
