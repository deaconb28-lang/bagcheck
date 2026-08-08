import { cardArt, cardBySlug, isDbConfigured } from "@/lib/db";
import { stripCells } from "@/lib/cards";
import { renderCard } from "./render";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const card = isDbConfigured() ? await cardBySlug(slug) : null;
  if (!card) return new Response("Not found", { status: 404 });
  // Only Wrapped has a backdrop, so only Wrapped pays for the extra read.
  const art = card.artModel ? await cardArt(slug) : null;
  return renderCard({ ...card, art }, stripCells(card.slug));
}
