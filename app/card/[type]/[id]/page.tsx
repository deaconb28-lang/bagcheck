import { permanentRedirect, notFound } from "next/navigation";
import { cardBySlug, isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ type: string; id: string }> };

/**
 * The typed share URL. `id` is the card's slug — 96 random bits, which stays
 * the access model — and `type` is the kind, so a pasted link reads as what
 * it is rather than as an opaque token.
 *
 * The card itself renders at /c/[slug], which is where every link minted
 * before this route existed points and where the OpenGraph tags live. Rather
 * than keep two copies of the page in step, this validates that the type
 * actually matches the stored card and hands off with a 301 — every unfurler
 * that matters follows a permanent redirect before reading meta tags.
 *
 * A mismatched type is a 404, not a redirect: guessing types against a known
 * slug should not become a way to probe anything.
 */
export default async function TypedCardPage({ params }: Props) {
  const { type, id } = await params;
  const card = isDbConfigured() ? await cardBySlug(id) : null;
  if (!card || card.type !== type) notFound();
  permanentRedirect(`/c/${card.slug}`);
}
