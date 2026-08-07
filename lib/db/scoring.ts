import { computeScore, inferBaseline } from "@/lib/score";
import type { ScoreResult, TxnLite } from "@/lib/score";
import { getCollections } from "./collections";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Load a user's ledger, compute today's Discipline score, and store it
 * as one doc per user per day. The stored styleBaseline on the
 * connection wins; otherwise the baseline is inferred from cadence.
 */
export async function scoreUser(userId: string, date = todayISO()): Promise<ScoreResult> {
  const { connections, transactions, scores } = await getCollections();

  const [conn, txns] = await Promise.all([
    connections.findOne({ userId }),
    transactions
      .find({ userId })
      .project<TxnLite>({
        _id: 0,
        date: 1,
        type: 1,
        symbol: 1,
        units: 1,
        price: 1,
        amount: 1,
      })
      .toArray(),
  ]);

  const baseline = conn?.styleBaseline ?? inferBaseline(txns, date);
  const result = computeScore({ date, baseline, transactions: txns });

  await scores.updateOne(
    { userId, date },
    {
      $set: {
        userId,
        date,
        baseline: result.baseline,
        score: result.score,
        components: result.components,
        contributors: result.contributors,
        computedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return result;
}
