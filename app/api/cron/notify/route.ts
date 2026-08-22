import { ObjectId } from "mongodb";
import { NextResponse, type NextRequest } from "next/server";
import {
  connectedCount,
  getCollections,
  getDb,
  getDerived,
  isDbConfigured,
  loadAppData,
  sweep,
} from "@/lib/db";
import { notify, wantsEmail } from "@/lib/db/notify";
import { scheduledSend } from "@/lib/email/schedule";
import { dailyBrief, weeklyRecap } from "@/lib/email/content";
import { isEmailConfigured } from "@/lib/email/send";
import { unsubscribeUrl } from "@/lib/email/token";
import { archetypeFor } from "@/lib/archetypes";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const JOB = "notify";

/**
 * The one send a day.
 *
 * Monday is the weekly recap and every other day is the daily brief — never
 * both, because a user gets one notification a day and the send log enforces
 * that even if this route is called twice. There is no third message and no
 * place in this file to add one that fires on a price.
 *
 * Runs after the nightly score, so the figures it reports are today's, and it
 * sweeps the same resumable way — it had the identical loop-every-user-under-a
 * -60-second-cap shape, which on any real mailing list would have sent to the
 * first handful of addresses and quietly dropped the rest.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured() || !isEmailConfigured()) {
    return NextResponse.json({ error: "email is not configured" }, { status: 503 });
  }

  const now = new Date();

  /*
   * Two sends a week, not seven. `scheduledSend` owns which — Monday morning
   * is the brief, Friday evening is the recap, and every other tick of a
   * fifteen-minute cron falls outside both and does nothing.
   *
   * Returning before the sweep matters: the sweep advances a stored cursor,
   * and walking every user ninety-six times a day to decide there is nothing
   * to send would move that cursor for no reason.
   */
  const window = scheduledSend(now);
  if (!window) {
    return NextResponse.json({
      job: JOB,
      sent: 0,
      skipped: 0,
      window: null,
      detail: "outside the Monday-morning and Friday-evening windows",
    });
  }

  const { kind } = window;
  const date = now.toISOString().slice(0, 10);
  const base = process.env.APP_URL || req.nextUrl.origin;

  const { insights, tags, transactions } = await getCollections();

  let sent = 0;
  let skipped = 0;

  const result = await sweep(JOB, async (userId) => {
    if (!(await wantsEmail(userId, kind))) {
      skipped += 1;
      return;
    }

    const to = await emailFor(userId);
    if (!to) {
      skipped += 1;
      return;
    }

    const { scores } = await loadAppData(userId, 90);
    const latest = scores[0] ?? null;
    if (!latest) {
      skipped += 1;
      return;
    }

    const content =
      kind === "brief"
        ? dailyBrief({
            date: latest.date,
            score: latest.score,
            previousScore: scores[1]?.score ?? null,
            previousDate: scores[1]?.date ?? null,
            archetype: archetypeFor(latest.components)?.name ?? null,
            ...(await writtenInsight(insights, userId, latest.date)),
            untagged: await untaggedCount(transactions, tags, userId),
            streak: streakOf(scores.map((s) => s.score)),
          })
        : weeklyRecap(await recapInput(userId, scores));

    const outcome = await notify(userId, to, date, kind, content, unsubscribeUrl(userId, base));
    if (outcome.sent) sent += 1;
    else skipped += 1;
  });

  return NextResponse.json({
    ...result,
    kind,
    window: window.window,
    sent,
    skipped,
    connected: await connectedCount(),
  });
}

/**
 * The address Auth.js stored at sign-in. Read here rather than carried around
 * the app: an address is only ever needed at the moment something is sent.
 */
async function emailFor(userId: string): Promise<string | null> {
  try {
    const users = (await getDb()).collection<{ email?: string }>("users");
    const doc = await users.findOne({ _id: new ObjectId(userId) });
    return doc?.email ?? null;
  } catch {
    // A dev identity is not an ObjectId and has no user row — nothing to
    // send to, which is the correct outcome rather than an error.
    return null;
  }
}

async function writtenInsight(
  insights: Awaited<ReturnType<typeof getCollections>>["insights"],
  userId: string,
  date: string,
): Promise<{ sentence: string; tail: string }> {
  const doc = await insights.findOne({ userId, date, kind: "daily" });
  return { sentence: doc?.text ?? "", tail: doc?.tail ?? "" };
}

async function untaggedCount(
  transactions: Awaited<ReturnType<typeof getCollections>>["transactions"],
  tags: Awaited<ReturnType<typeof getCollections>>["tags"],
  userId: string,
): Promise<number> {
  const [buys, tagged] = await Promise.all([
    transactions.countDocuments({ userId, type: { $regex: /buy/i } }),
    tags.countDocuments({ userId }),
  ]);
  return Math.max(0, buys - tagged);
}

/** Consecutive scored days at or above the discipline floor, most recent first. */
function streakOf(scores: number[]): number {
  let n = 0;
  for (const score of scores) {
    if (score < 60) break;
    n += 1;
  }
  return n;
}

async function recapInput(
  userId: string,
  scores: Awaited<ReturnType<typeof loadAppData>>["scores"],
) {
  const derived = await getDerived(userId);
  const week = (derived?.dailyPnl ?? []).slice(-5);
  const realised = week.length ? week.reduce((sum, d) => sum + d.realised, 0) : null;
  const latest = scores[0];
  const weekScores = scores.slice(0, 7);

  return {
    weekOf: weekScores.at(-1)?.date ?? latest.date,
    scoredDays: weekScores.length,
    score: latest.score,
    weekDelta: weekScores.length > 1 ? latest.score - weekScores[weekScores.length - 1].score : null,
    realised,
    greenSessions: week.filter((d) => d.realised > 0).length,
    redSessions: week.filter((d) => d.realised < 0).length,
    longestHoldDays:
      (derived?.roundTrips ?? []).reduce((m, t) => Math.max(m, t.holdDays), 0) || null,
    archetype: archetypeFor(latest.components)?.name ?? null,
  };
}
