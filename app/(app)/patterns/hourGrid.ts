import type { HourCell } from "@/components/idioms";
import type { RoundTrip, TxnLite } from "@/lib/score";

/**
 * Return by entry hour and weekday — pure.
 *
 * A window with no entries stays null rather than zero: "you never trade at
 * 9am on a Monday" is a different fact from "you break even at 9am on a
 * Monday", and a heat grid that renders them the same is lying quietly.
 */
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const HOURS = ["9", "10", "11", "12", "13", "14", "15", "16"];

export function hourGrid(trips: RoundTrip[], txns: TxnLite[]): HourCell[][] {
  const opened = new Map<string, string>();
  for (const t of txns) {
    if (!t.date || !t.symbol) continue;
    if (!(t.type ?? "").toLowerCase().includes("buy")) continue;
    const key = `${t.symbol}:${t.date.slice(0, 10)}`;
    if (!opened.has(key)) opened.set(key, t.date);
  }

  const buckets: number[][][] = DAYS.map(() => HOURS.map(() => []));

  for (const trip of trips) {
    const iso = opened.get(`${trip.symbol}:${trip.openDate.slice(0, 10)}`) ?? trip.openDate;
    if (!iso || iso.length <= 10) continue; // date-only: no clock to read
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;

    const weekday = d.getUTCDay() - 1;
    const hour = d.getUTCHours();
    const col = HOURS.indexOf(String(hour));
    if (weekday < 0 || weekday > 4 || col < 0) continue;

    const notional = trip.notional || 1;
    buckets[weekday][col].push((trip.pnl / notional) * 100);
  }

  return buckets.map((row) =>
    row.map((samples) => ({
      n: samples.length,
      mean: samples.length ? samples.reduce((s, x) => s + x, 0) / samples.length : null,
    })),
  );
}

/** True when the brokerage reports times at all. Without them there is no grid. */
export function hasClock(txns: TxnLite[]): boolean {
  return txns.some((t) => (t.date?.length ?? 0) > 10);
}
