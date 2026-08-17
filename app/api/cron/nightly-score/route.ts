import { NextResponse, type NextRequest } from "next/server";
import {
  connectedCount,
  ensureIndexes,
  getCollections,
  isDbConfigured,
  scoreUser,
  sweep,
} from "@/lib/db";
import { syncIsDue } from "@/lib/db/due";
import { warmUser } from "@/lib/db/warm";
import { credentialCheck, syncUser } from "@/lib/snaptrade";

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

  const { connections } = await getCollections();
  let synced = 0;
  let fresh = 0;
  let insights = 0;
  let decks = 0;
  let failed = 0;

  const result = await sweep(JOB, async (userId) => {
    /*
     * The sweep wraps every run on a small table, so without this every user
     * was pulled from SnapTrade ninety-six times a day. The score still runs
     * on every visit — it is local arithmetic over rows already in Mongo — but
     * the brokerage is only asked once a day.
     */
    const connection = await connections.findOne(
      { userId },
      { projection: { _id: 0, lastSyncAt: 1 } },
    );

    if (syncIsDue(connection?.lastSyncAt, new Date())) {
      /*
       * The sync is best effort and the score is not. A broker that fails today
       * must still leave a reading against yesterday's ledger, so these are two
       * statements rather than one chain.
       */
      try {
        await syncUser(userId);
        synced += 1;
      } catch (err) {
        failed += 1;
        console.error("[cron] sync failed", userId, err);
      }
    } else {
      fresh += 1;
    }

    await scoreUser(userId);

    /*
     * Then build what the screens would otherwise build while someone waits:
     * the day's written insight and this year's Wrapped deck. Both are cached
     * per user and both were filled lazily by whoever opened the page first.
     */
    const warmed = await warmUser(userId);
    if (warmed.insight) insights += 1;
    if (warmed.wrapped) decks += 1;
  });

  /*
   * `synced` and `fresh` are reported because "is the brokerage being asked
   * once a day" has to be a checkable question rather than an assumption —
   * that it was not is exactly what the previous version hid.
   */
  /*
   * A sync that fails is caught so one broken account cannot stop the sweep —
   * but caught is not the same as noticed, and every sync in production was
   * failing 401 with nothing above the log line to say so. When any did, ask
   * SnapTrade which credential it is rejecting: the client's, or that user's
   * stored secret. The two need opposite fixes and a bare 401 cannot tell them
   * apart, so the answer travels with the job's own result.
   */
  const credentials = failed ? await credentialCheck() : null;

  return NextResponse.json({
    ...result,
    synced,
    fresh,
    failed,
    insights,
    decks,
    connected: await connectedCount(),
    ...(credentials ? { credentials } : {}),
  });
}
