import { archetypeFor } from "@/lib/archetypes";
import type { Archetype } from "@/lib/archetypes";
import type { HeatDay } from "@/components/idioms";
import type { ScoreDoc, TransactionDoc } from "@/lib/db";
import type { ScoreComponents } from "@/lib/score";
import type { WaveDay } from "@/components/idioms";

/**
 * Screen-shaped views of the ledger — pure, so what a screen claims is
 * testable without a database.
 *
 * Everything here reads the brokerage's own numbers. Nothing invents a
 * figure, and where the ledger cannot answer, the function returns an empty
 * result rather than a plausible one.
 */

/** Realised P&L per session, from sells only — a buy is not a result. */
export function dailyPnl(transactions: TransactionDoc[], days = 63): WaveDay[] {
  const byDate = new Map<string, number>();
  for (const txn of transactions) {
    const date = txn.date?.slice(0, 10);
    if (!date || !txn.amount) continue;
    const type = (txn.type ?? "").toLowerCase();
    if (!type.includes("sell") && !type.includes("dividend")) continue;
    byDate.set(date, (byDate.get(date) ?? 0) + txn.amount);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-days)
    .map(([date, amount]) => ({ date, amount }));
}

export interface WaveSummary {
  green: number;
  red: number;
  best: number | null;
  worst: number | null;
  total: number;
}

export function waveSummary(days: WaveDay[]): WaveSummary {
  const green = days.filter((d) => d.amount > 0).length;
  const red = days.filter((d) => d.amount < 0).length;
  const amounts = days.map((d) => d.amount);
  return {
    green,
    red,
    best: amounts.length ? Math.max(...amounts) : null,
    worst: amounts.length ? Math.min(...amounts) : null,
    total: amounts.reduce((s, a) => s + a, 0),
  };
}

/**
 * Scored days as a heat grid. The level is the score banded into five, so
 * the grid reads as one measurement — a day inside your rules is dark, a day
 * outside is pale, and an unscored day is the empty cell.
 */
export function heatFromScores(scores: ScoreDoc[], weeks = 26): HeatDay[] {
  const byDate = new Map(scores.map((s) => [s.date, s.score]));
  const out: HeatDay[] = [];
  const today = new Date();
  const total = weeks * 7;

  for (let i = total - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    const score = byDate.get(date);
    out.push({
      date,
      level: score == null ? 0 : score >= 90 ? 4 : score >= 78 ? 3 : score >= 64 ? 2 : 1,
      note: score == null ? `${date} — not scored` : `${date} — ${score}`,
    });
  }
  return out;
}

/** The longest run of scored days at or above the baseline, ending today. */
export function currentStreak(scores: ScoreDoc[], floor = 64): number {
  const sorted = [...scores].sort((a, b) => b.date.localeCompare(a.date));
  let run = 0;
  for (const s of sorted) {
    if (s.score < floor) break;
    run += 1;
  }
  return run;
}

export function longestStreak(scores: ScoreDoc[], floor = 64): number {
  const sorted = [...scores].sort((a, b) => a.date.localeCompare(b.date));
  let best = 0;
  let run = 0;
  for (const s of sorted) {
    run = s.score >= floor ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/**
 * The archetype. Delegates to the sixteen-corner table in `lib/archetypes.ts`
 * — this used to name four, from whichever single component happened to be
 * highest, which meant two people with completely different records shared a
 * name whenever they happened to peak in the same place.
 *
 * Kept as a screen-level helper because every screen already imports from
 * here, and because the cast is the awkward part: score components arrive
 * from Mongo as a loose record.
 */
export function archetypeOf(components: Record<string, number> | null): Archetype {
  return archetypeFor((components ?? null) as ScoreComponents | null);
}

/** Weekly delta against the oldest score in the last seven scored days. */
export function weekDelta(scores: ScoreDoc[]): number | null {
  const week = scores.slice(0, 7);
  if (week.length < 2) return null;
  return week[0].score - week[week.length - 1].score;
}

export const money = (value: number | null, currency = "USD", digits = 0) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: digits,
      }).format(value);

export const signedMoney = (value: number | null, currency = "USD") =>
  value == null ? "—" : `${value >= 0 ? "+" : "−"}${money(Math.abs(value), currency)}`;

/**
 * Sessions per ISO week, oldest first — the cadence card's series.
 *
 * Counts sessions that closed something, because that is what a session is
 * in a realised-P&L ledger. A week with no closed round trip is a zero, not
 * a gap: the point of the card is how little the rhythm moves, and dropping
 * the quiet weeks would flatter it.
 */
export function weeklySessions(dailyPnl: Array<{ date: string }>): number[] {
  const byWeek = new Map<string, number>();
  for (const day of dailyPnl) {
    const d = new Date(`${day.date}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    // Monday-anchored key, so a week is a week rather than a rolling seven.
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }
  return [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, n]) => n);
}
