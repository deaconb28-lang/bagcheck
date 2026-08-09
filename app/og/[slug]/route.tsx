import { cardBySlug, isDbConfigured } from "@/lib/db";
import { stripCells } from "@/lib/cards";
import { renderCard } from "./render";
import type { ShareFormat } from "@/lib/cards/share";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  /*
   * ?format=feed and ?format=story exist because Instagram and TikTok have no
   * web composer to open — the only way a card reaches them is as a file, and
   * a 16:9 unfurl dropped into a 9:16 story is a postage stamp. Anything
   * unrecognised falls back to the unfurl rather than erroring: this URL is in
   * OpenGraph tags that must never 400.
   */
  const asked = new URL(req.url).searchParams.get("format");
  const format: ShareFormat = asked === "feed" || asked === "story" ? asked : "unfurl";
  const card = isDbConfigured() ? await cardBySlug(slug) : null;
  if (!card) return new Response("Not found", { status: 404 });
  return renderCard(card, stripCells(card.slug), format);
}
