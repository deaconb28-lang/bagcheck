import { NextResponse, type NextRequest } from "next/server";
import { backgroundCards, drawBackground } from "@/lib/wrapped/backgrounds";

export const runtime = "nodejs";
/* One high-quality portrait image is tens of seconds. Give it room. */
export const maxDuration = 300;

/**
 * Draws one Wrapped background, where the key lives.
 *
 * `npm run wrapped:backgrounds` does the same thing from a shell and is the
 * ordinary way to do it. This route exists for the same reason
 * `/api/photos/refresh` does: the OpenAI key lives in the deployment, and a
 * build step that needs it should not require copying it somewhere else
 * first. A credential that has to travel to be used is a credential that ends
 * up in a place nobody is tracking.
 *
 * One card per request rather than twelve, because twelve PNGs at card size
 * is a response nothing wants to hold in memory and a timeout waiting to
 * happen. The caller loops.
 *
 *   curl -fsS "https://…/api/wrapped/backgrounds?card=01" \
 *     -H "Authorization: Bearer $WRAPPED_REFRESH_TOKEN" -o bg-01.png
 *
 * The bytes are returned, not stored. These are committed to
 * `public/wrapped/2026/backgrounds` and served as static files — a background
 * is the same for every reader and for every year the set is current, so
 * putting it in a database would be paying a query to answer a question that
 * never changes.
 *
 * **Without the token set the route does not exist.** An admin action with no
 * secret configured is an open one, and this one spends money.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.WRAPPED_REFRESH_TOKEN;
  if (!secret) return new Response("Not found", { status: 404 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 503 });
  }

  const asked = new URL(req.url).searchParams.get("card");
  const card = backgroundCards().find((c) => c.no === asked || c.key === asked);
  if (!card) {
    return NextResponse.json(
      { error: "unknown card", cards: backgroundCards().map((c) => c.no) },
      { status: 400 },
    );
  }

  try {
    const png = await drawBackground(card);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "X-Card-Key": card.key,
        /* Drawn to be committed, never to be served from here. */
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[wrapped] background failed", card.no, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "draw failed" },
      { status: 502 },
    );
  }
}
