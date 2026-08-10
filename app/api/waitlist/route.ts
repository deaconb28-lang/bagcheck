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
  await waitlist.updateOne(
    { email: email.toLowerCase() },
    {
      $set: { tier: askedTier },
      $setOnInsert: { email: email.toLowerCase(), joinedAt: new Date() },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
