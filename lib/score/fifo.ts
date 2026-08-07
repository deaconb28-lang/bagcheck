import type { RoundTrip, TxnLite } from "./types";
import { classify, daysBetween, parseDay } from "./util";

interface Lot {
  date: string;
  units: number;
  price: number;
}

/**
 * FIFO-match buys to sells per symbol, producing realized round trips.
 * Sells without a matching lot (shorts, or history that predates the
 * ledger) are ignored rather than guessed at.
 */
export function buildRoundTrips(transactions: TxnLite[]): RoundTrip[] {
  const usable = transactions
    .filter(
      (t) =>
        t.date &&
        t.symbol &&
        t.units != null &&
        t.units > 0 &&
        t.price != null &&
        (classify(t.type) === "buy" || classify(t.type) === "sell"),
    )
    .sort((a, b) => parseDay(a.date!) - parseDay(b.date!));

  const lots = new Map<string, Lot[]>();
  const trips: RoundTrip[] = [];

  for (const txn of usable) {
    const symbol = txn.symbol!;
    const kind = classify(txn.type);
    if (kind === "buy") {
      const queue = lots.get(symbol) ?? [];
      queue.push({ date: txn.date!, units: txn.units!, price: txn.price! });
      lots.set(symbol, queue);
      continue;
    }

    let remaining = txn.units!;
    const queue = lots.get(symbol) ?? [];
    while (remaining > 0 && queue.length > 0) {
      const lot = queue[0];
      const take = Math.min(lot.units, remaining);
      trips.push({
        symbol,
        openDate: lot.date,
        closeDate: txn.date!,
        holdDays: daysBetween(lot.date, txn.date!),
        pnl: (txn.price! - lot.price) * take,
        notional: lot.price * take,
      });
      lot.units -= take;
      remaining -= take;
      if (lot.units <= 0) queue.shift();
    }
  }

  return trips;
}
