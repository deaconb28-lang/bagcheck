import type { RoundTrip, TxnLite } from "@/lib/score";
import { MIN_SAMPLE } from "./correlations";
import type { Finding } from "./correlations";

/*
 * Tilt and drift — machine-readable versions of the states a trader can name
 * in other people and not in themselves. Observations, never instructions:
 * each names what the ledger shows and stops there.
 */

const dayOf = (iso: string | null): string | null => iso?.slice(0, 10) ?? null;
const isBuy = (t: TxnLite) => (t.type ?? "").toLowerCase().includes("buy");
const isTrade = (t: TxnLite) => {
  const k = (t.type ?? "").toLowerCase();
  return k.includes("buy") || k.includes("sell");
};
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/**
 * Buy size the session after a red day, against every other session. "Session
 * after" means the next date with any activity, so a Friday loss still pairs
 * with Monday's buys.
 */
export function sizingAfterLoss(trips: RoundTrip[], txns: TxnLite[]): Finding | null {
  const redDays = new Set<string>();
  const pnlByDay = new Map<string, number>();
  for (const t of trips) pnlByDay.set(t.closeDate, (pnlByDay.get(t.closeDate) ?? 0) + t.pnl);
  for (const [d, pnl] of pnlByDay) if (pnl < 0) redDays.add(d);
  if (!redDays.size) return null;

  const activeDays = [...new Set(txns.map((t) => dayOf(t.date)).filter((d): d is string => !!d))].sort();
  const prevActive = new Map<string, string>();
  for (let i = 1; i < activeDays.length; i += 1) prevActive.set(activeDays[i], activeDays[i - 1]);

  const afterLoss: number[] = [];
  const otherwise: number[] = [];
  for (const t of txns) {
    if (!isBuy(t) || t.amount == null) continue;
    const d = dayOf(t.date);
    if (!d) continue;
    const prev = prevActive.get(d);
    (prev && redDays.has(prev) ? afterLoss : otherwise).push(Math.abs(t.amount));
  }
  if (afterLoss.length < MIN_SAMPLE || otherwise.length < MIN_SAMPLE) return null;

  const ratio = mean(afterLoss) / mean(otherwise);
  const evidence = `${afterLoss.length} buys after red days · ${otherwise.length} otherwise`;

  if (ratio >= 1.35) {
    return {
      key: "sizing-after-loss",
      tag: "Sizing after a loss",
      sentence: `The session after a red day, your average buy runs ${ratio.toFixed(1)}× your usual size.`,
      evidence,
      tone: "signal",
      impact: null, // sizing is exposure, not a realised bucket
    };
  }
  if (ratio <= 0.74) {
    return {
      key: "sizing-after-loss",
      tag: "Sizing after a loss",
      sentence: `You size down after a red day — buys run ${(1 / ratio).toFixed(1)}× smaller than usual.`,
      evidence,
      tone: "moss",
      impact: null,
    };
  }
  return null;
}

/**
 * This week's trade count against the trailing twelve-week pace. Takes the
 * anchor date rather than reading a clock, so the same ledger always says the
 * same thing.
 */
export function tradeDrift(txns: TxnLite[], today: string): Finding | null {
  const anchor = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(anchor)) return null;
  const daysAgo = (d: string) => (anchor - Date.parse(`${d}T00:00:00Z`)) / 86_400_000;

  let week = 0;
  let baseline = 0;
  for (const t of txns) {
    if (!isTrade(t)) continue;
    const d = dayOf(t.date);
    if (!d) continue;
    const ago = daysAgo(d);
    if (ago < 0) continue;
    if (ago < 7) week += 1;
    else if (ago < 91) baseline += 1;
  }
  // Twelve weeks of history and a real burst — not a quiet ledger's first busy day.
  if (baseline < 24 || week < MIN_SAMPLE) return null;

  const weeklyPace = baseline / 12;
  if (weeklyPace <= 0 || week / weeklyPace < 2) return null;

  return {
    key: "trade-drift",
    tag: "Cadence drift",
    sentence: `You traded ${week} times this week — ${(week / weeklyPace).toFixed(1)}× your twelve-week pace.`,
    evidence: `${week} this week · ${weeklyPace.toFixed(1)}/wk baseline`,
    tone: "signal",
    impact: null,
  };
}

/** Every tilt reading the ledger currently supports. */
export function tiltFindings(trips: RoundTrip[], txns: TxnLite[], today: string): Finding[] {
  return [sizingAfterLoss(trips, txns), tradeDrift(txns, today)].filter(
    (f): f is Finding => f !== null,
  );
}
