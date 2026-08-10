import { randomBytes } from "node:crypto";
import { getCollections } from "./collections";

/**
 * The live score badge — one per user, minted on demand. The slug is the
 * badge's entire access model, exactly like a card's: 96 random bits, no
 * user id anywhere in the URL.
 */
export async function mintBadge(userId: string): Promise<string> {
  const { badges } = await getCollections();
  const existing = await badges.findOne({ userId }, { projection: { _id: 0, slug: 1 } });
  if (existing) return existing.slug;
  const slug = `b-${randomBytes(12).toString("base64url")}`;
  await badges.insertOne({ userId, slug, mintedAt: new Date() });
  return slug;
}

/** The badge's public read: the latest score, and nothing about the person. */
export async function badgeBySlug(
  slug: string,
): Promise<{ score: number; date: string } | null> {
  const { badges, scores } = await getCollections();
  const badge = await badges.findOne({ slug }, { projection: { _id: 0, userId: 1 } });
  if (!badge) return null;
  const latest = await scores
    .find({ userId: badge.userId })
    .sort({ date: -1 })
    .limit(1)
    .project<{ score: number; date: string }>({ _id: 0, score: 1, date: 1 })
    .next();
  return latest ?? null;
}
