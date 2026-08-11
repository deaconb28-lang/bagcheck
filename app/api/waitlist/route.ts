import { NextResponse } from "next/server";
import { getCollections, isDbConfigured } from "@/lib/db";

/**
 * The waitlist. One row per email, idempotent — joining twice from a
 * different card just updates which tier they asked for. No auth: the whole
 * point of a waitlist is that the person does not have an account yet.
 */
export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "not taking signups yet" }, { status: 503 });
  }

  let email: unknown;
  let tier: unknown;
  try {
    ({ email, tier } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "that does not read as an email" }, { status: 422 });
  }
  const askedTier =
    tier === "early" || tier === "premium" ? tier : "waitlist";

  const { waitlist } = await getCollections();
  const address = email.toLowerCase();
  const result = await waitlist.updateOne(
    { email: address },
    {
      $set: { tier: askedTier },
      $setOnInsert: { email: address, joinedAt: new Date() },
    },
    { upsert: true },
  );

  /*
   * Whether this address was already on the list, so the screen can say the
   * true thing rather than the generic one — "you're already on it" answers
   * the question someone submitting twice is actually asking, and a second
   * "you're on the list" reads like the first one did not take.
   */
  return NextResponse.json({ ok: true, joined: result.upsertedCount > 0, email: address });
}
