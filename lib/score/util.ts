import type { TxnKind, TxnLite } from "./types";

export const DAY_MS = 86_400_000;

export function parseDay(value: string): number {
  return new Date(value).getTime();
}

export function daysBetween(a: string, b: string): number {
  return Math.max(0, (parseDay(b) - parseDay(a)) / DAY_MS);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Coefficient of variation — dispersion relative to the user's own mean. */
export function cv(values: number[]): number {
  const m = mean(values);
  if (m === 0 || values.length < 2) return 0;
  const variance = mean(values.map((v) => (v - m) ** 2));
  return Math.sqrt(variance) / Math.abs(m);
}

export function classify(type: string | null): TxnKind {
  if (!type) return "other";
  const t = type.toLowerCase();
  if (t.includes("buy")) return "buy";
  if (t.includes("sell")) return "sell";
  if (t.includes("contribution") || t.includes("deposit")) return "deposit";
  if (t.includes("dividend")) return "dividend";
  return "other";
}

export function isTrade(txn: TxnLite): boolean {
  const kind = classify(txn.type);
  return kind === "buy" || kind === "sell";
}

/** Transactions whose date falls in (asOf - startDaysAgo, asOf - endDaysAgo]. */
export function inWindow(
  txns: TxnLite[],
  asOf: string,
  startDaysAgo: number,
  endDaysAgo = 0,
): TxnLite[] {
  const end = parseDay(asOf) - endDaysAgo * DAY_MS;
  const start = parseDay(asOf) - startDaysAgo * DAY_MS;
  return txns.filter((t) => {
    if (!t.date) return false;
    const ts = parseDay(t.date);
    return ts > start && ts <= end;
  });
}
