import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import {
  factsFrom,
  getCollections,
  getDailyInsight,
  scoreUser,
} from "@/lib/db";

/** Recompute today's score, then redraft the readout that describes it. */
export async function POST() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const score = await scoreUser(userId);

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
      date: score.date,
      score: score.score,
      baseline: score.baseline,
      components: score.components,
      contributors: score.contributors,
      insight,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
