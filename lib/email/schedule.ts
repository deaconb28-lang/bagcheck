import type { NotificationKind } from "@/lib/db/notify";

/**
 * When Supercruise is allowed to write to you, and which of the two it sends.
 *
 * This was "Monday is the recap, every other day is the brief" — seven
 * messages a week, six of them saying roughly the same thing on a ledger that
 * mostly has not moved. Two a week, at the two moments a week actually has
 * edges:
 *
 *   · **Monday morning** — the `brief`. Where you stand going in: the score,
 *     what moved it, the streak, anything still untagged.
 *   · **Friday evening** — the `recap`. The week that just closed, once the
 *     market has: scored days, sessions, realised P&L.
 *
 * The two kinds are unchanged, because `NotificationKind` is persisted on
 * every row of the send log and in each user's preferences — renaming them
 * would be a migration, and what changed is when they go out, not what they
 * are.
 *
 * **The windows are UTC and deliberately wide.** The cron ticks every fifteen
 * minutes, so a two-hour window is eight chances to catch a send that a
 * deploy, a cold start or a provider wobble would otherwise drop for a whole
 * week. Sending twice is not the risk it looks like: the send log's unique
 * index on {userId, date} means the first attempt of a window claims the day
 * and every later one is told it is already handled.
 *
 * That index is also why **a window must never cross midnight UTC** — two
 * dates would be two claims, and the one thing this product promises about
 * email is that it does not send twice.
 */

/** UTC day numbers, so the two rules read as English rather than as integers. */
const MONDAY = 1;
const FRIDAY = 5;

/**
 * Hours are chosen against US Eastern, which is where this product's readers
 * are: 12:00 UTC is 8am in summer and 7am in winter, and 22:00 UTC is 6pm and
 * 5pm. Both stay inside the intended half of the day on either side of the
 * daylight-saving change, which a narrower window would not.
 */
const MORNING_START = 12;
const MORNING_END = 14; // exclusive
const EVENING_START = 22;
const EVENING_END = 24; // exclusive — midnight is the next UTC date

export interface SendWindow {
  kind: NotificationKind;
  /** Which window this is, for the log line and nothing else. */
  window: "monday-morning" | "friday-evening";
}

/**
 * The send window `now` falls in, or `null` if it falls in none — which is
 * almost always, and is a state rather than a failure.
 */
export function scheduledSend(now: Date): SendWindow | null {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  if (day === MONDAY && hour >= MORNING_START && hour < MORNING_END) {
    return { kind: "brief", window: "monday-morning" };
  }
  if (day === FRIDAY && hour >= EVENING_START && hour < EVENING_END) {
    return { kind: "recap", window: "friday-evening" };
  }
  return null;
}

/**
 * The cadence in words, for the one place a reader is told what they are
 * turning on. Stated here rather than typed into the settings screen, so the
 * promise and the schedule cannot drift apart.
 */
export const SEND_CADENCE: Record<NotificationKind, string> = {
  brief: "Monday morning",
  recap: "Friday evening",
};
