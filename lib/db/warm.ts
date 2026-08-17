import { loadScreen } from "./screen";
import { factsFrom, getDailyInsight } from "./insights";
import { wrappedYear } from "@/lib/wrapped/year";

/**
 * Build the two slow things ahead of the reader.
 *
 * The daily insight and the Wrapped deck are both *cached* per user — the
 * insight per day, the deck per stats fingerprint — and both were built lazily,
 * by whoever opened the page first. Which means the reader who arrives first
 * each day pays for a model call, and the reader who opens Wrapped after a sync
 * that moved a figure pays for twelve. A cache filled by the person waiting on
 * it is not a cache, it is a queue.
 *
 * So the nightly job fills them. It already visits every connected user, it
 * already holds the budget for slow work, and nobody is watching it — which is
 * the whole difference. By the time a screen asks, the row is there.
 *
 * Every step is best effort and swallowed: warming is an optimisation, and an
 * optimisation that can fail a scheduled job would take the sync and the score
 * down with it. What it returns is what actually got warmed, so the job's
 * response can say so rather than imply it.
 */
export interface WarmResult {
  insight: boolean;
  wrapped: boolean;
}

export async function warmUser(userId: string, now: Date = new Date()): Promise<WarmResult> {
  const out: WarmResult = { insight: false, wrapped: false };

  const data = await loadScreen(userId, 400).catch(() => null);
  if (!data) return out;

  const latest = data.scores[0] ?? null;
  if (latest) {
    try {
      /*
       * Same call the screen makes, so it fills the same row under the same
       * key. A warmer that computed its own variant would be a second answer
       * to the same question, and the screen would still pay for the first.
       */
      await getDailyInsight(
        userId,
        factsFrom(
          latest,
          data.scores[1] ?? null,
          data.scores[6] ?? null,
          data.transactionCount,
          data.connection?.accounts?.length ?? 0,
        ),
      );
      out.insight = true;
    } catch {
      /* No key, no model, no matter — the screen falls back as it always did. */
    }
  }

  try {
    /*
     * `wrappedYear` is the cached path: same stats fingerprint, same cards, no
     * model calls. It only spends anything when a figure a card states has
     * actually moved — which, after a sync, is exactly when it should.
     */
    await wrappedYear(userId, now.getUTCFullYear());
    out.wrapped = true;
  } catch {
    /* A year with nothing earned yet is not a failure. */
  }

  return out;
}
