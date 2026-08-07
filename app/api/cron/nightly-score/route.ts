import { NextResponse, type NextRequest } from "next/server";
import { getCollections, scoreUser } from "@/lib/db";
import { syncUser } from "@/lib/snaptrade";

export const maxDuration = 60;

/**
 * Nightly recompute: refresh each connected user's ledger from
 * SnapTrade (best effort), then compute and store today's score.
 * Vercel Cron calls this with `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { connections } = await getCollections();
  const users = await connections
    .find({})
    .project<{ userId: string }>({ _id: 0, userId: 1 })
    .toArray();

  let synced = 0;
  let scored = 0;
  const errors: string[] = [];

  for (const { userId } of users) {
    try {
      await syncUser(userId);
      synced += 1;
    } catch (err) {
      errors.push(`sync ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      await scoreUser(userId);
      scored += 1;
    } catch (err) {
      errors.push(`score ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ users: users.length, synced, scored, errors });
}
