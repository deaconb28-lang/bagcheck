import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import {
  backfillScores,
  factsFrom,
  getCollections,
  getDailyInsight,
} from "@/lib/db";

/**
 * Rebuild the score history, then redraft the readout that describes it.
 *
 * This is the escape hatch behind "Score my ledger now" on an account that
 * has none, so it backfills rather than writing today alone — landing on a
 * dashboard with a single score and an empty streak is the state the reader
 * pressed the button to get out of. Days already stored are skipped, so
 * pressing it twice is cheap.
 */
export async function POST() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const { written, from, to } = await backfillScores(userId);

    const { scores, connections, transactions } = await getCollections();
    const [recent, connection, transactionCount] = await Promise.all([
      scores.find({ userId }).sort({ date: -1 }).limit(8).toArray(),
      connections.findOne({ userId }),
      transactions.countDocuments({ userId }),
    ]);

    const latest = recent[0];
    const insight = latest
      ? await getDailyInsight(
          userId,
          factsFrom(
            latest,
            recent[1] ?? null,
            recent.length > 1 ? recent[recent.length - 1] : null,
            transactionCount,
            connection?.accounts.length ?? 0,
          ),
          // The score just changed, so the sentence describing it is stale.
          { refresh: true },
        )
      : null;

    return NextResponse.json({
      scored: written,
      from,
      to,
      date: latest?.date ?? to,
      score: latest?.score ?? null,
      baseline: latest?.baseline ?? null,
      components: latest?.components ?? null,
      contributors: latest?.contributors ?? [],
      insight,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
