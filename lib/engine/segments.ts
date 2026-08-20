import type { RoundTrip, TxnLite } from "@/lib/score";
import type { Finding } from "./correlations";

/*
 * Event segments, first form: the stress windows in the reader's own equity
 * curve, and what they did inside them. Cross-user ranks — "top 12% for the
 * March selloff" — need a user base to be true, so nothing here claims one;
 * the reading is the user against their own window, which is the part that
 * is verifiable today. The window shape is kept stable so a future segment
 * leaderboard scores the same object.
 */

export interface EquityPoint {
  date: string;
  value: number;
}

export interface EventWindow {
  /** The peak the fall started from, YYYY-MM-DD. */
  start: string;
  /** Recovery to the prior peak, or the end of the series while still under it. */
  end: string;
  troughDate: string;
  /** Peak-to-trough, positive percent. */
  drawdownPct: number;
  /** "March 2026" — named for the month the trough landed in. */
  label: string;
  /** False while the series is still below the peak that opened the window. */
  recovered: boolean;
}

/** Below this a dip is weather, not an event. */
export const MIN_DEPTH_PCT = 12;
/** Fewer points than this and a "window" is two bad prints. */
const MIN_SERIES = 60;

const monthLabel = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * Every drawdown of at least `minDepthPct` in the series, deepest first.
 * A window opens at a peak, bottoms at its trough and closes on recovery to
 * that peak — or at the end of the series, still open.
 */
export function drawdownWindows(
  equity: EquityPoint[],
  minDepthPct: number = MIN_DEPTH_PCT,
): EventWindow[] {
  if (equity.length < MIN_SERIES) return [];

  const windows: EventWindow[] = [];
  let peak = equity[0];
  let trough: EquityPoint | null = null;

  const close = (end: string, recovered: boolean) => {
    if (!trough || peak.value <= 0) return;
    const depth = ((peak.value - trough.value) / peak.value) * 100;
    if (depth < minDepthPct) return;
    windows.push({
      start: peak.date,
      end,
      troughDate: trough.date,
      drawdownPct: depth,
      label: monthLabel(trough.date),
      recovered,
    });
  };

  for (const point of equity.slice(1)) {
    if (point.value >= peak.value) {
      close(point.date, true);
      peak = point;
      trough = null;
    } else if (!trough || point.value < trough.value) {
      trough = point;
    }
  }
  close(equity[equity.length - 1].date, false);

  return windows.sort((a, b) => b.drawdownPct - a.drawdownPct);
}

const dayOf = (iso: string | null): string | null => iso?.slice(0, 10) ?? null;
const isBuy = (t: TxnLite) => (t.type ?? "").toLowerCase().includes("buy");

/**
 * What the reader did inside a window. Null when they were barely present —
 * a window they slept through is not their event.
 */
export function segmentReading(
  window: EventWindow,
  trips: RoundTrip[],
  txns: TxnLite[],
): Finding | null {
  const inside = (d: string) => d >= window.start && d <= window.end;

  const adds = txns.filter((t) => {
    const d = dayOf(t.date);
    return d !== null && isBuy(t) && inside(d);
  }).length;
  const heldThrough = trips.filter(
    (t) => t.openDate < window.start && t.closeDate > window.end,
  ).length;
  const closedInside = trips.filter((t) => inside(t.closeDate));
  const lossSells = closedInside.filter((t) => t.pnl < 0).length;
  const realised = closedInside.reduce((s, t) => s + t.pnl, 0);

  if (adds + heldThrough + closedInside.length < 3) return null;

  const frame = `Through the ${window.label} drawdown — ${window.drawdownPct.toFixed(0)}% peak to trough — `;
  const sentence =
    lossSells === 0 && heldThrough > 0
      ? `${frame}you held ${heldThrough} ${heldThrough === 1 ? "position" : "positions"} and sold nothing at a loss.`
      : lossSells > 0
        /*
         * The figure is not in the sentence. Every surface that draws a
         * finding prints `impact` as the hero and again on the evidence line,
         * so spelling it out here put one number on the card three times —
         * which is how a two-line reading turns into a paragraph.
         */
        ? `${frame}you closed ${lossSells} ${lossSells === 1 ? "position" : "positions"} at a loss.`
        : `${frame}you added ${adds} ${adds === 1 ? "position" : "positions"}.`;

  return {
    key: `segment-${window.start}`,
    tag: "Event window",
    sentence,
    evidence: `${window.start} → ${window.end}${window.recovered ? "" : " · still open"} · ${adds} adds · ${heldThrough} held through · ${lossSells} loss sells`,
    tone: lossSells === 0 && heldThrough > 0 ? "moss" : lossSells > 0 ? "clay" : "signal",
    impact: closedInside.length ? realised : null,
  };
}

/** The two deepest windows the reader was actually present in. */
export function eventSegments(
  equity: EquityPoint[],
  trips: RoundTrip[],
  txns: TxnLite[],
): Finding[] {
  return drawdownWindows(equity)
    .map((w) => segmentReading(w, trips, txns))
    .filter((f): f is Finding => f !== null)
    .slice(0, 2);
}
