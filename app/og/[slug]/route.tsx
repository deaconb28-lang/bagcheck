import { cardBySlug, isDbConfigured } from "@/lib/db";
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
  return renderCard(card, stripCells(card.slug));
}
