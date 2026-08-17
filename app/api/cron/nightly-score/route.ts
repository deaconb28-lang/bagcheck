import { NextResponse, type NextRequest } from "next/server";
import { connectedCount, ensureIndexes, isDbConfigured, scoreUser, sweep } from "@/lib/db";
import { syncUser } from "@/lib/snaptrade";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const JOB = "nightly-score";

/**
 * Nightly recompute, one resumable slice at a time.
 *
 * It refreshes each connected user's ledger from SnapTrade and then computes
 * and stores the day's score. What it does *not* do any more is try to cover
 * every user in one request: it used to loop the whole table serially under a
 * 60-second cap, which got through roughly two accounts before the platform
 * killed it, and everyone after that silently went unscored.
 *
 * Point a cron at it often enough that the sweep goes all the way round once a
 * day. The response reports the connected total and whether this call closed a
 * sweep, so "is the whole table being covered" is a checkable question rather
 * than an assumption.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "ledger store not configured" }, { status: 503 });
  }

  /*
   * The one place the schema is guaranteed to be applied on a live deployment.
   *
   * Indexes were only ever created as a side effect of a sync, a scoring run
   * or an insight write — so a deployment with no connected users had none at
   * all, and the first person to connect got their sync *and* the index build
   * on the same request. This job runs on a schedule whether or not anyone is
   * connected, and `ensureIndexes` is memoised per process, so it costs one
   * round trip per process rather than one per run.
   */
  await ensureIndexes();

  const result = await sweep(JOB, async (userId) => {
    /*
     * The sync is best effort and the score is not. A broker that fails today
     * must still leave a reading against yesterday's ledger, so these are two
     * statements rather than one chain.
     */
    try {
      await syncUser(userId);
    } catch (err) {
      console.error("[cron] sync failed", userId, err);
    }
    await scoreUser(userId);
  });

  return NextResponse.json({ ...result, connected: await connectedCount() });
}
