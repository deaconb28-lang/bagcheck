import { getCollections } from "./collections";
import type { TaggedOpen } from "@/lib/engine";
import type { Conviction, WhyKey } from "@/lib/tags";

/**
 * The tag join, server-side: every tag on file resolved to the symbol and
 * open day of the transaction it annotates — the shape the engine's
 * tag-joined half consumes. One place, because three surfaces (Wrapped,
 * Cards, the mint route) all need the same join and must never disagree
 * about what a tag points at.
 */
export async function taggedOpensFor(userId: string): Promise<{
  opens: TaggedOpen[];
  kindCounts: Partial<Record<WhyKey, number>>;
}> {
  const { tags, transactions } = await getCollections();
  const tagDocs = await tags
    .find({ userId })
    .project<{ transactionId: string; why: WhyKey; conviction: Conviction }>({
      _id: 0,
      transactionId: 1,
      why: 1,
      conviction: 1,
    })
    .toArray();
  if (!tagDocs.length) return { opens: [], kindCounts: {} };

  const txns = await transactions
    .find({ userId, externalId: { $in: tagDocs.map((t) => t.transactionId) } })
    .project<{ externalId: string; symbol: string | null; date: string | null }>({
      _id: 0,
      externalId: 1,
      symbol: 1,
      date: 1,
    })
    .toArray();
  const byId = new Map(txns.map((t) => [t.externalId, t]));

  const opens: TaggedOpen[] = [];
  const kindCounts: Partial<Record<WhyKey, number>> = {};
  for (const tag of tagDocs) {
    kindCounts[tag.why] = (kindCounts[tag.why] ?? 0) + 1;
    const txn = byId.get(tag.transactionId);
    if (!txn?.symbol || !txn.date) continue;
    opens.push({
      symbol: txn.symbol,
      date: txn.date.slice(0, 10),
      why: tag.why,
      conviction: tag.conviction,
    });
  }
  return { opens, kindCounts };
}
