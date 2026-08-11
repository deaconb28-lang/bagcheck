import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getUserId } from "@/auth";
import { isDbConfigured, tierFor } from "@/lib/db";
import { stripCells } from "@/lib/cards";
import { can } from "@/lib/tiers";
import { assembleWrapped } from "@/lib/wrapped/assemble";
import { renderCard } from "@/app/og/[slug]/render";
import type { CardSpec } from "@/lib/cards/kinds";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The quarterly report as a carousel — the Plus format for people who write.
 *
 * One ZIP of feed-format PNGs, one slide per card the window earned, built
 * by the same assembly the Wrapped screen renders. Nothing is designed here:
 * the export *is* the screen, which is the whole credibility argument.
 */
export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "ledger store not configured" }, { status: 503 });
  }
  const tier = await tierFor(userId);
  if (!can({ tier }, "reportCarousel")) {
    return NextResponse.json({ error: "the carousel is a Plus format" }, { status: 403 });
  }

  const w = new URL(req.url).searchParams.get("w") ?? undefined;
  const assembled = await assembleWrapped(userId, w);
  if (!assembled || !assembled.cards.length) {
    return NextResponse.json({ error: "that window has no cards" }, { status: 422 });
  }

  const zip = new JSZip();
  let index = 1;
  for (const spec of assembled.cards) {
    const image = await renderCard(
      cardLike(spec, assembled.label),
      stripCells(`${spec.kind}-${assembled.label}`),
      "feed",
    );
    zip.file(
      `${String(index).padStart(2, "0")}-${spec.kind}.png`,
      Buffer.from(await image.arrayBuffer()),
    );
    index += 1;
  }

  const bytes = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="bagcheck-${assembled.label.replaceAll(" ", "-").toLowerCase()}-carousel.zip"`,
      "cache-control": "private, no-store",
    },
  });
}

/** The same fold the mint route stores — spec down to what a card face says. */
function cardLike(spec: CardSpec, label: string) {
  const value =
    spec.body.kind === "figure" || spec.body.kind === "chart" ? spec.body.value : spec.headline;
  return {
    slug: `${spec.kind}-${label}`,
    type: spec.kind,
    label: spec.eyebrow,
    value,
    tail: spec.lede,
    tone: (spec.hue === "azure" || spec.hue === "violet" ? "signal" : "moss") as "moss" | "signal",
    rarity: spec.rarity,
    symbol: spec.symbol,
  };
}
