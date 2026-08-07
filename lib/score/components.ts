import { WEEK_BANDS, tradesPerWeek } from "./baseline";
import type { Contributor, RoundTrip, StyleBaseline, TxnLite } from "./types";
import { classify, clamp, cv, daysBetween, inWindow, isTrade, mean, median, parseDay } from "./util";

export interface ComponentResult {
  score: number;
  signals: Contributor[];
}

const NEUTRAL = 70;

/** Signed contributor value from a subscore and its weight; ±9 cap. */
function impact(subscore: number, weight: number): number {
  return Math.round(clamp(((subscore - NEUTRAL) * weight) / 2, -9, 9));
}

/**
 * Consistency — cadence and sizing against the user's own trailing
 * baseline, not anyone else's. Windows are 4 weeks vs the prior 12,
 * so a single day cannot spike it.
 */
export function consistency(txns: TxnLite[], asOf: string): ComponentResult {
  const recentCount = inWindow(txns, asOf, 28).filter(isTrade).length;
  const priorCount = inWindow(txns, asOf, 112, 28).filter(isTrade).length;
  if (recentCount < 4 && priorCount < 4) {
    return { score: 72, signals: [] };
  }

  const recentTpw = tradesPerWeek(txns, asOf, 28);
  const priorTpw = tradesPerWeek(txns, asOf, 84, 28);
  const ratio = (recentTpw + 0.25) / (priorTpw + 0.25);
  const cadence = clamp(100 - Math.abs(Math.log(ratio)) * 45, 40, 100);

  const recentBuys = inWindow(txns, asOf, 28)
    .filter((t) => classify(t.type) === "buy" && t.amount != null)
    .map((t) => Math.abs(t.amount!));
  const priorBuys = inWindow(txns, asOf, 112, 28)
    .filter((t) => classify(t.type) === "buy" && t.amount != null)
    .map((t) => Math.abs(t.amount!));
  let sizing = 74;
  if (recentBuys.length >= 4 && priorBuys.length >= 4) {
    const cvRatio = (cv(recentBuys) + 0.1) / (cv(priorBuys) + 0.1);
    sizing = clamp(100 - Math.abs(Math.log(cvRatio)) * 40, 40, 100);
  }

  const score = Math.round(0.6 * cadence + 0.4 * sizing);
  const signals: Contributor[] = [];
  if (cadence >= 88 && impact(cadence, 0.3) !== 0) {
    signals.push({ name: "Cadence steady against your baseline", value: impact(cadence, 0.3), tone: "gold" });
  }
  if (cadence <= 55 && impact(cadence, 0.3) !== 0) {
    signals.push({ name: "Trading pace far from your baseline", value: impact(cadence, 0.3), tone: "violet" });
  }
  if (sizing <= 55 && impact(sizing, 0.2) !== 0) {
    signals.push({ name: "Sizing drifted from your baseline", value: impact(sizing, 0.2), tone: "violet" });
  }
  return { score, signals };
}

/**
 * Patience — hold-time behaviour from realized round trips: how long
 * winners are held relative to losers, and (outside the active
 * baseline) the share of sub-day flips.
 */
export function patience(
  trips: RoundTrip[],
  baseline: StyleBaseline,
  asOf: string,
): ComponentResult {
  const closed = trips.filter((t) => daysBetween(t.closeDate, asOf) <= 84);
  if (closed.length < 3) {
    return { score: 72, signals: [] };
  }

  const winners = closed.filter((t) => t.pnl > 0);
  const losers = closed.filter((t) => t.pnl <= 0);
  let hold = 76;
  let ratio: number | null = null;
  if (winners.length > 0 && losers.length > 0) {
    ratio =
      (mean(winners.map((t) => t.holdDays)) + 0.5) /
      (mean(losers.map((t) => t.holdDays)) + 0.5);
    hold = clamp(70 + (30 * Math.log(ratio)) / Math.log(4), 20, 100);
  }

  const quickShare = closed.filter((t) => t.holdDays < 1).length / closed.length;
  const flips = baseline === "active" ? null : clamp(100 - quickShare * 130, 30, 100);

  const score = Math.round(flips == null ? hold : 0.7 * hold + 0.3 * flips);
  const signals: Contributor[] = [];
  if (ratio != null && ratio >= 1.3 && impact(hold, 0.3) !== 0) {
    signals.push({ name: "Held winners longer than losers", value: impact(hold, 0.3), tone: "gold" });
  }
  if (ratio != null && ratio <= 0.75 && impact(hold, 0.3) !== 0) {
    signals.push({ name: "Sold winners faster than losers", value: impact(hold, 0.3), tone: "clay" });
  }
  if (flips != null && flips <= 60 && impact(flips, 0.15) !== 0) {
    signals.push({ name: "Quick flips above your baseline", value: impact(flips, 0.15), tone: "violet" });
  }
  return { score, signals };
}

/**
 * Exposure — trade count against the declared style's band, plus
 * concentration of traded notional in a single name. A day trader at
 * their own baseline is not penalized.
 */
export function exposure(
  txns: TxnLite[],
  baseline: StyleBaseline,
  asOf: string,
): ComponentResult {
  const band = WEEK_BANDS[baseline];
  const recent = inWindow(txns, asOf, 28).filter(isTrade);
  if (recent.length === 0) {
    return { score: 88, signals: [] };
  }

  const tpw = tradesPerWeek(txns, asOf, 28);
  let count: number;
  if (tpw <= band.ideal) {
    count = 95;
  } else if (tpw <= band.cap) {
    count = 95 - (50 * (tpw - band.ideal)) / (band.cap - band.ideal);
  } else {
    count = 32;
  }

  const bySymbol = new Map<string, number>();
  let gross = 0;
  for (const t of recent) {
    if (!t.symbol || t.amount == null) continue;
    const notional = Math.abs(t.amount);
    gross += notional;
    bySymbol.set(t.symbol, (bySymbol.get(t.symbol) ?? 0) + notional);
  }
  const topShare = gross > 0 ? Math.max(...bySymbol.values()) / gross : 0;
  const conc =
    topShare <= 0.35 ? 90 : topShare >= 0.7 ? 42 : 90 - (topShare - 0.35) * (48 / 0.35);

  const score = Math.round(0.6 * count + 0.4 * conc);
  const signals: Contributor[] = [];
  if (tpw > band.ideal && impact(count, 0.2) !== 0) {
    signals.push({ name: "Trade count above your baseline", value: impact(count, 0.2), tone: "violet" });
  }
  if (tpw <= band.ideal && impact(count, 0.2) !== 0) {
    signals.push({ name: "Trade count inside your baseline", value: impact(count, 0.2), tone: "gold" });
  }
  if (topShare > 0.5 && impact(conc, 0.1) !== 0) {
    signals.push({ name: "Concentrated in one name", value: impact(conc, 0.1), tone: "violet" });
  }
  return { score, signals };
}

/**
 * Adherence — until the M7 rule engine brings user-stated rules, two
 * honest proxies: contribution regularity, and whether sell counts
 * spike in weeks where realized P&L is negative.
 */
export function adherence(
  txns: TxnLite[],
  trips: RoundTrip[],
  asOf: string,
): ComponentResult {
  const deposits = inWindow(txns, asOf, 180)
    .filter((t) => classify(t.type) === "deposit" && (t.amount ?? 0) > 0 && t.date)
    .sort((a, b) => parseDay(a.date!) - parseDay(b.date!));
  let dep = 70;
  if (deposits.length >= 3) {
    const intervals: number[] = [];
    for (let i = 1; i < deposits.length; i++) {
      intervals.push(daysBetween(deposits[i - 1].date!, deposits[i].date!));
    }
    dep = clamp(95 - cv(intervals) * 40, 45, 95);
  }

  const WEEKS = 12;
  const sellsPerWeek = new Array<number>(WEEKS).fill(0);
  const pnlPerWeek = new Array<number>(WEEKS).fill(0);
  for (const t of inWindow(txns, asOf, WEEKS * 7)) {
    if (classify(t.type) !== "sell" || !t.date) continue;
    const week = Math.min(
      WEEKS - 1,
      Math.floor(daysBetween(t.date, asOf) / 7),
    );
    sellsPerWeek[week] += 1;
  }
  const closed = trips.filter((t) => daysBetween(t.closeDate, asOf) <= WEEKS * 7);
  for (const trip of closed) {
    const week = Math.min(WEEKS - 1, Math.floor(daysBetween(trip.closeDate, asOf) / 7));
    pnlPerWeek[week] += trip.pnl;
  }
  const med = median(sellsPerWeek);
  const flagged = sellsPerWeek.filter(
    (sells, week) => pnlPerWeek[week] < 0 && sells > Math.max(3, 2 * med),
  ).length;
  const panic = clamp(85 - flagged * 15, 35, 85);

  const score = Math.round(0.5 * dep + 0.5 * panic);
  const signals: Contributor[] = [];
  if (deposits.length >= 3 && dep >= 85 && impact(dep, 0.2) !== 0) {
    signals.push({ name: "Contributions on schedule", value: impact(dep, 0.2), tone: "gold" });
  }
  if (deposits.length >= 3 && dep <= 55 && impact(dep, 0.2) !== 0) {
    signals.push({ name: "Contributions off schedule", value: impact(dep, 0.2), tone: "violet" });
  }
  if (flagged > 0 && impact(panic, 0.25) !== 0) {
    signals.push({ name: "Sold into a losing week", value: impact(panic, 0.25), tone: "clay" });
  }
  if (flagged === 0 && closed.length >= 3 && impact(panic, 0.15) !== 0) {
    signals.push({ name: "No sells into losing weeks", value: impact(panic, 0.15), tone: "gold" });
  }
  return { score, signals };
}
