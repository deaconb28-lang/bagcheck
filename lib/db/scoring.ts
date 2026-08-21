import { computeScore, inferBaseline } from "@/lib/score";
import { dateRange, earliestDate, scoreRange } from "@/lib/score/backfill";
import type { ScoreResult, TxnLite } from "@/lib/score";
import { ensureIndexes, getCollections } from "./collections";

function todayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * How far back a backfill reaches.
 *
 * Two years covers everything that reads a run of scores — the 26-week
 * consistency grid, the 60-day no-panic card and the 180-scored-day annual
 * Wrapped — with a year to spare, and bounds the work: on a 2,847-row ledger
 * a full 730-day backfill is about six seconds, and every sync after the first
 * only recomputes the day that changed.
 */
export const BACKFILL_DAYS = 730;

/**
 * Load a user's ledger, compute today's Health score, and store it
 * as one doc per user per day. The stored styleBaseline on the
 * connection wins; otherwise the baseline is inferred from cadence.
 */
export async function scoreUser(userId: string, date = todayISO()): Promise<ScoreResult | null> {
  // The unique {userId, date} index must exist before the upsert below,
  // which may run before any sync has created it.
  await ensureIndexes();
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
  /*
   * No score is a real outcome, and it does not get written.
   *
   * A night the ledger cannot support at least two of the four components is
   * a night with nothing to say, and storing a row for it would put a figure
   * in the history that nobody measured — which every screen downstream would
   * then band, streak, rank and draw. The dashboard already handles an account
   * with no scores: `view.read` is null and the money leads.
   */
  if (!result) return null;

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
        measured: result.measured,
        scoreVersion: SCORE_VERSION,
        computedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return result;
}

/**
 * Score every day the ledger covers, not just today.
 *
 * Until this existed `scoreUser` was the only writer, and it wrote one
 * document for the current date — so a freshly connected account held exactly
 * one score however deep its history ran, and gained one a day. Every screen
 * that reads a *run* of scores was empty as a result: the streak, the
 * consistency grid, the week-over-week delta, and the cards gated on 14, 60
 * and 180 scored days. The last of those is the annual Wrapped card, which
 * made the artefact the landing page sells unreachable inside a year.
 *
 * The ledger already knew what happened on all of those days. Now they get
 * scored.
 *
 * Cheap after the first run: days already stored are skipped, so a routine
 * sync recomputes only the day it just changed. `force` re-scores the whole
 * window, which is what a baseline change needs — the baseline feeds patience
 * and exposure, so changing it invalidates every score behind it.
 */
/**
 * The scorer's generation.
 *
 * Bump this when the scorer changes what a stored row *means* — not when it
 * changes what it computes from the same inputs, which the ledger hash already
 * covers. Version 2 is the first that can say "this component had no
 * evidence": before it, every component fell back to a neutral figure, so an
 * account that had traded nothing was stored at 78/72/72/88 and rendered a
 * confident 76 with an archetype on it.
 *
 * Those rows are not stale, they are manufactured, and fixing the scorer does
 * not reach them: `backfillScores` skips any date it already has. Treating a
 * row below this version as absent is what carries the fix into the history.
 */
export const SCORE_VERSION = 2;

export async function backfillScores(
  userId: string,
  opts: { days?: number; now?: Date; force?: boolean } = {},
): Promise<{ written: number; from: string; to: string }> {
  const { days = BACKFILL_DAYS, now = new Date(), force = false } = opts;

  await ensureIndexes();
  const { connections, transactions, scores } = await getCollections();

  const [conn, txns] = await Promise.all([
    connections.findOne({ userId }),
    transactions
      .find({ userId })
      .project<TxnLite>({ _id: 0, date: 1, type: 1, symbol: 1, units: 1, price: 1, amount: 1 })
      .toArray(),
  ]);

  const to = todayISO(now);
  /* A ledger with no dated rows still gets today, so the screen has a number. */
  const earliest = earliestDate(txns) ?? to;
  const floor = new Date(Date.parse(to) - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const from = earliest > floor ? earliest : floor;

  const baseline = conn?.styleBaseline ?? inferBaseline(txns, to);

  /*
   * A row written by an older scorer does not count as "have". It is not a
   * cheaper version of the same answer — it is a different one, computed under
   * rules that invented figures, and leaving it in place would keep those
   * figures on the screen for as long as the account exists.
   */
  const have = force
    ? new Set<string>()
    : new Set(
        (
          await scores
            .find({ userId, date: { $gte: from }, scoreVersion: SCORE_VERSION })
            .project<{ date: string }>({ _id: 0, date: 1 })
            .toArray()
        ).map((s) => s.date),
      );

  const results = scoreRange({ transactions: txns, baseline, from, to, have });

  /*
   * Sweep the manufactured rows this pass could not replace.
   *
   * Rewriting is not enough on its own. The scorer now returns nothing for a
   * day it cannot support two components on, so a date that used to hold an
   * invented 76 produces no new row — and an upsert-only backfill would leave
   * the invented one exactly where it was. Anything in the range still below
   * the current version after the write is a reading no scorer will stand
   * behind, so it goes.
   *
   * Scoped to `[from, to]` on purpose: this deletes scores, and a bug in the
   * range is a bug that deletes somebody's history. Outside the window nothing
   * is touched.
   */
  const sweep = async () => {
    await scores.deleteMany({
      userId,
      date: { $gte: from, $lte: to },
      scoreVersion: { $ne: SCORE_VERSION },
    });
  };

  if (results.length === 0) {
    await sweep();
    return { written: 0, from, to };
  }

  const computedAt = new Date();
  await scores.bulkWrite(
    results.map((r) => ({
      updateOne: {
        filter: { userId, date: r.date },
        update: {
          $set: {
            userId,
            date: r.date,
            baseline: r.baseline,
            score: r.score,
            components: r.components,
            contributors: r.contributors,
            measured: r.measured,
            scoreVersion: SCORE_VERSION,
            computedAt,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  await sweep();

  return { written: results.length, from, to };
}

/** How many days a backfill would cover, without doing any of the work. */
export function backfillSpan(earliest: string | null, now = new Date(), days = BACKFILL_DAYS): number {
  const to = todayISO(now);
  const floor = new Date(Date.parse(to) - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const from = earliest && earliest > floor ? earliest : floor;
  return dateRange(from, to).length;
}
