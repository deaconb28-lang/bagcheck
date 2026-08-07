import { generateInsight } from "@/lib/insights";
import type { InsightFacts, InsightResult } from "@/lib/insights";
import { ensureIndexes, getCollections } from "./collections";
import type { ScoreDoc } from "./types";

export function factsFrom(
  latest: ScoreDoc,
  previous: ScoreDoc | null,
  weekStart: ScoreDoc | null,
  transactionCount: number,
  accountCount: number,
): InsightFacts {
  return {
    date: latest.date,
    baseline: latest.baseline,
    score: latest.score,
    previousScore: previous?.score ?? null,
    weekDelta: weekStart ? latest.score - weekStart.score : null,
    components: latest.components,
    contributors: latest.contributors,
    transactionCount,
    accountCount,
  };
}

/**
 * One insight per user per day. The daily brief is a cadence, not a
 * per-page-load API call — a cached row is returned untouched, and only
 * a genuinely new day (or an explicit refresh) reaches the model.
 */
export async function getDailyInsight(
  userId: string,
  facts: InsightFacts,
  { refresh = false }: { refresh?: boolean } = {},
): Promise<InsightResult> {
  await ensureIndexes();
  const { insights } = await getCollections();

  if (!refresh) {
    const existing = await insights.findOne({ userId, date: facts.date, kind: "daily" });
    if (existing) {
      return {
        sentence: existing.text,
        tail: existing.tail ?? "",
        source: existing.source ?? "fallback",
      };
    }
  }

  const result = await generateInsight(facts);

  await insights.updateOne(
    { userId, date: facts.date, kind: "daily" },
    {
      $set: {
        userId,
        date: facts.date,
        kind: "daily",
        text: result.sentence,
        tail: result.tail,
        source: result.source,
        rejected: result.rejected ?? null,
        generatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return result;
}
