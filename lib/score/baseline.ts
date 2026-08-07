import type { StyleBaseline, TxnLite } from "./types";
import { inWindow, isTrade } from "./util";

/**
 * Expected trades per week for each declared style. `ideal` is the
 * upper edge of on-baseline behaviour; `cap` is where the exposure
 * component bottoms out.
 */
export const WEEK_BANDS: Record<StyleBaseline, { ideal: number; cap: number }> = {
  "long-term": { ideal: 1, cap: 4 },
  swing: { ideal: 10, cap: 25 },
  active: { ideal: 60, cap: 150 },
};

export function tradesPerWeek(
  txns: TxnLite[],
  asOf: string,
  windowDays: number,
  endDaysAgo = 0,
): number {
  const trades = inWindow(txns, asOf, windowDays + endDaysAgo, endDaysAgo).filter(isTrade);
  return trades.length / ((windowDays || 1) / 7);
}

/**
 * Style inferred from observed cadence — used until the user picks a
 * baseline at onboarding. An explicit choice always wins over this.
 */
export function inferBaseline(txns: TxnLite[], asOf: string): StyleBaseline {
  const tpw = tradesPerWeek(txns, asOf, 84);
  if (tpw >= 10) return "active";
  if (tpw >= 1.5) return "swing";
  return "long-term";
}
