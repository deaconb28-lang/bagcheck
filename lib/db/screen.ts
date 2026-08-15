import { getCollections } from "./collections";
import { getDerived } from "./derived";
import { holdingsFrom, loadAppData } from "./queries";
import type { DerivedDoc } from "./types";
import { tierFor as tierForUser } from "./subscriptions";
import { modeFor } from "./prefs";
import type { AppData, HoldingRow } from "./queries";
import type { Mode } from "./prefs";
import type { Tier } from "@/lib/tiers";
import { investorAge } from "@/lib/score";

/**
 * One round trip for everything the shell and the screens read.
 *
 * Every route needs the same header — score, sync time, tier — so gathering
 * it in one place keeps seven screens from each inventing their own version
 * of "what is the current score".
 */
export interface ScreenData extends AppData {
  holdings: HoldingRow[];
  /**
   * Round trips, daily P&L, equity and hold times — read, not recomputed.
   * Null only when the ledger is empty.
   */
  derived: DerivedDoc | null;
  tier: Tier;
  mode: Mode;
  /** Entries with a why on file, and the openings that could carry one. */
  tagged: number;
  taggable: number;
  /** The header stat: how old the conduct reads. Null before a first score. */
  investorAge: number | null;
}

export async function loadScreen(userId: string, scoreLimit = 400): Promise<ScreenData> {
  const app = await loadAppData(userId, scoreLimit);
  const { tags, transactions } = await getCollections();

  const [tier, mode, tagged, taggable, derived] = await Promise.all([
    tierForUser(userId).catch(() => "free" as Tier),
    modeFor(userId),
    tags.countDocuments({ userId }),
    transactions.countDocuments({ userId, type: { $regex: /buy/i } }),
    getDerived(userId).catch((err) => {
      // A missing derived document degrades a chart, not a page.
      console.error("[screen] derived unavailable", err);
      return null;
    }),
  ]);

  return {
    ...app,
    holdings: holdingsFrom(app.snapshots),
    derived,
    tier,
    mode,
    tagged,
    taggable,
    investorAge: investorAge({
      components: app.scores[0]?.components ?? null,
      winnersMeanHold: derived?.holdTime.winnersMean ?? null,
      scoredDays: app.scores.length,
    }),
  };
}

/**
 * How long ago the ledger was last read — "just now", "2h ago", "3d ago".
 * Null when it never has been.
 *
 * This used to print `at.toISOString().slice(11, 16)`, which is a UTC wall
 * clock: a reader in California who synced at 5pm saw "SYNCED 00:00" and had
 * no way to tell whether that was recent. The page renders on the server, so
 * there is no reader timezone to format into — but an elapsed time needs
 * none, and answers the question the pill is actually being asked.
 *
 * Rounds down, so it never claims a sync is fresher than it is.
 */
export function syncClock(at: Date | null | undefined, now = new Date()): string | null {
  if (!at) return null;
  const seconds = Math.floor((now.getTime() - at.getTime()) / 1000);

  /* A clock skew between the writer and the reader must not read as the future. */
  if (seconds < 90) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return `${Math.floor(days / 30)}mo ago`;
}
