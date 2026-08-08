import { getCollections } from "./collections";
import { holdingsFrom, loadAppData } from "./queries";
import { tierFor as tierForUser } from "./subscriptions";
import { modeFor } from "./prefs";
import type { AppData, HoldingRow } from "./queries";
import type { Mode } from "./prefs";
import type { Tier } from "@/lib/tiers";

/**
 * One round trip for everything the shell and the screens read.
 *
 * Every route needs the same header — score, sync time, tier — so gathering
 * it in one place keeps seven screens from each inventing their own version
 * of "what is the current score".
 */
export interface ScreenData extends AppData {
  holdings: HoldingRow[];
  tier: Tier;
  mode: Mode;
  /** Entries with a why on file, and the openings that could carry one. */
  tagged: number;
  taggable: number;
}

export async function loadScreen(userId: string, scoreLimit = 400): Promise<ScreenData> {
  const app = await loadAppData(userId, scoreLimit);
  const { tags, transactions } = await getCollections();

  const [tier, mode, tagged, taggable] = await Promise.all([
    tierForUser(userId).catch(() => "free" as Tier),
    modeFor(userId),
    tags.countDocuments({ userId }),
    transactions.countDocuments({ userId, type: { $regex: /buy/i } }),
  ]);

  return { ...app, holdings: holdingsFrom(app.snapshots), tier, mode, tagged, taggable };
}

/** "06:14" — the header's sync pill. Null when the ledger never synced. */
export function syncClock(at: Date | null | undefined): string | null {
  if (!at) return null;
  return at.toISOString().slice(11, 16);
}
