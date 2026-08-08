import { randomBytes } from "node:crypto";
import { Binary } from "mongodb";
import { getCollections } from "./collections";
import type { CardDoc } from "./types";
import type { CardSpec } from "@/lib/cards";

/**
 * The slug is the card's whole access model: a card page is public so it can
 * unfurl in a message, which means the slug has to be unguessable. 96 bits
 * of randomness, not a hash of the contents.
 */
function newSlug(kind: string): string {
  return `${kind}-${randomBytes(12).toString("base64url")}`;
}

/** Mint a card from a spec. Returns the slug the card lives at. */
export async function mintCard(
  userId: string,
  spec: CardSpec,
  date: string,
  art?: { png: Buffer; model: string } | null,
): Promise<string> {
  const { cards } = await getCollections();
  const slug = newSlug(spec.kind);
  await cards.insertOne({
    userId,
    date,
    type: spec.kind,
    slug,
    label: spec.label,
    value: spec.value,
    tail: spec.tail,
    tone: spec.tone,
    rarity: spec.rarity,
    symbol: spec.symbol,
    art: art ? new Binary(art.png) : null,
    artModel: art?.model ?? null,
    mintedAt: new Date(),
    url: null,
  });
  return slug;
}

/**
 * Read a card for public display. Deliberately takes no userId: these pages
 * are meant to be opened by people who are not the owner. Only the fields a
 * card renders are projected — never userId, never anything else on the doc.
 */
export async function cardBySlug(slug: string): Promise<Omit<
  CardDoc,
  "userId" | "url" | "art"
> | null> {
  const { cards } = await getCollections();
  return cards.findOne(
    { slug },
    {
      projection: {
        _id: 0,
        date: 1,
        type: 1,
        slug: 1,
        label: 1,
        value: 1,
        tail: 1,
        tone: 1,
        rarity: 1,
        symbol: 1,
        artModel: 1,
        mintedAt: 1,
      },
    },
  );
}

/** The cards this user has already minted, newest first. */
export async function cardsFor(userId: string, limit = 12) {
  const { cards } = await getCollections();
  return cards
    .find({ userId })
    .sort({ mintedAt: -1 })
    .limit(limit)
    .project<Omit<CardDoc, "userId" | "url">>({ _id: 0, userId: 0, url: 0 })
    .toArray();
}

/**
 * The Wrapped backdrop, served separately from the page.
 *
 * Kept out of cardBySlug on purpose: a megabyte of PNG has no business
 * travelling inside the HTML payload of every card view.
 */
export async function cardArt(slug: string): Promise<Buffer | null> {
  const { cards } = await getCollections();
  const doc = await cards.findOne({ slug }, { projection: { _id: 0, art: 1 } });
  const art = doc?.art;
  return art ? Buffer.from(art.buffer) : null;
}
