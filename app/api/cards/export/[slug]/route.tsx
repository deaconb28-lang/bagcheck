import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { cardBySlug, isDbConfigured, tierFor } from "@/lib/db";
import { stripCells } from "@/lib/cards";
import { FORMAT_SIZE, type ShareFormat } from "@/lib/cards/share";
import { can } from "@/lib/tiers";
import { renderCard } from "@/app/og/[slug]/render";

export const runtime = "nodejs";

/**
 * Publication-grade export — the Pro format for people who write.
 *
 * The card itself is public by slug; what this route adds is the press
 * asset: the same composition at up to 4×, and a rounded variant with
 * transparent corners so it can sit inside a newsletter without a plate
 * behind it. That *rendering service* is the paid thing, which is why the
 * gate is on the caller's tier and not on the card.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "ledger store not configured" }, { status: 503 });
  }

  const tier = await tierFor(userId);
  if (!can({ tier }, "publicationExport")) {
    return NextResponse.json({ error: "publication exports are a Pro format" }, { status: 403 });
  }

  const url = new URL(req.url);
  const format = (["unfurl", "feed", "story"] as const).includes(
    url.searchParams.get("format") as ShareFormat,
  )
    ? (url.searchParams.get("format") as ShareFormat)
    : "feed";
  const scale = url.searchParams.get("scale") === "2" ? 2 : 4;
  const transparent = url.searchParams.get("variant") === "transparent";
  if (transparent && !can({ tier }, "transparentExport")) {
    return NextResponse.json({ error: "transparent exports are a Pro format" }, { status: 403 });
  }

  const { slug } = await params;
  const card = await cardBySlug(slug);
  if (!card) return NextResponse.json({ error: "no such card" }, { status: 404 });

  const image = await renderCard(card, stripCells(card.slug), format, {
    scale,
    rounded: transparent,
  });
  const { w, h } = FORMAT_SIZE[format];
  const png = Buffer.from(await image.arrayBuffer());
  return new NextResponse(png, {
    headers: {
      "content-type": "image/png",
      "content-disposition": `attachment; filename="supercruise-${card.type}-${w * scale}x${h * scale}${transparent ? "-transparent" : ""}.png"`,
      "cache-control": "private, no-store",
    },
  });
}
