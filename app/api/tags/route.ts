import { getUserId } from "@/auth";
import { getCollections, isDbConfigured } from "@/lib/db";
import { isConviction, isWhy, whyLabel } from "@/lib/tags";

export const runtime = "nodejs";

/**
 * Record a why and a conviction against one transaction.
 *
 * The transaction has to belong to the caller — a tag is scoped to a ledger
 * row, and a row nobody owns is not taggable. Stored lower-cased, matching
 * TagDoc's union and everything written before lib/tags existed.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  if (!isDbConfigured()) return new Response("No store", { status: 503 });

  const body = (await req.json().catch(() => null)) as {
    transactionId?: unknown;
    why?: unknown;
    conviction?: unknown;
  } | null;

  const transactionId = typeof body?.transactionId === "string" ? body.transactionId : null;
  const why = whyLabel(typeof body?.why === "string" ? body.why : null);
  const conviction = body?.conviction;

  if (!transactionId || !why || !isWhy(why) || !isConviction(conviction)) {
    return new Response("Bad tag", { status: 400 });
  }

  const { transactions, tags } = await getCollections();
  const txn = await transactions.findOne(
    { userId, externalId: transactionId },
    { projection: { _id: 0, date: 1 } },
  );
  if (!txn) return new Response("No such entry", { status: 404 });

  await tags.updateOne(
    { userId, transactionId },
    {
      $set: {
        why: why.toLowerCase() as "thesis",
        conviction,
        date: txn.date ?? new Date().toISOString().slice(0, 10),
      },
      $setOnInsert: { userId, transactionId },
    },
    { upsert: true },
  );

  return Response.json({ ok: true });
}
