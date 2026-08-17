/**
 * Whether a user's ledger is due a refresh from the brokerage.
 *
 * The nightly job syncs and scores every connected user. The sweep visits
 * twelve users a call and the schedule fires every fifteen minutes, so on a
 * table smaller than twelve the sweep wraps every single run — and every user
 * was getting a full paginated SnapTrade history pull ninety-six times a day.
 * The production log said so plainly: `visited: 3, wrapped: true, connected: 3`.
 *
 * SnapTrade is 83% of this product's marginal cost and is billed on free users,
 * so that is the most expensive line in the business being spent ninety-six
 * times over for one day's worth of data. A brokerage ledger does not change
 * ninety-six times a day; it changes when the market is open and a trade
 * settles.
 *
 * The schedule stays fast on purpose — a fifteen-minute sweep is what makes a
 * table of thousands come all the way round inside a day, and it is what lets
 * a user who just connected be picked up quickly. What changes is that the
 * *sync* is rate-limited per user while the *score* still runs on every visit:
 * scoring is local arithmetic over rows already in Mongo, and it costs nothing
 * to keep it daily-fresh.
 *
 * Pure, so the window is a thing a test can state rather than a thing a clock
 * decides.
 */

/**
 * How stale a ledger may be before the sweep refreshes it.
 *
 * Twenty hours rather than twenty-four: a job that only re-syncs after a full
 * day drifts later every day — each run happens a little after the last one
 * cleared the bar — until a "daily" sync quietly becomes every other day. A
 * window shorter than the period it guards is what stops the drift.
 */
export const SYNC_WINDOW_HOURS = 20;

export function syncIsDue(
  lastSyncAt: Date | null | undefined,
  now: Date,
  windowHours: number = SYNC_WINDOW_HOURS,
): boolean {
  /* Never synced — including a connection made moments ago — is always due. */
  if (!lastSyncAt) return true;
  const age = now.getTime() - lastSyncAt.getTime();
  /*
   * A timestamp in the future means a clock disagreement rather than a fresh
   * sync, and treating it as fresh would park that user until the clocks
   * reconciled. Due is the safe reading.
   */
  if (age < 0) return true;
  return age >= windowHours * 3_600_000;
}
