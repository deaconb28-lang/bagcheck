import { pooled, MAX_IN_FLIGHT } from "./client";
import { indexReturnYtd } from "./benchmark";
import type { RaceEntry } from "@/lib/returns";

/**
 * The field the reader is measured against, and where its numbers come from.
 *
 * **There is no hedge-fund index in this repository and there is no API key
 * for one.** A bar reading "Hedge funds +14.2%" off a constant would be a
 * fabricated figure on the one screen whose entire claim is that its numbers
 * came off a brokerage — the exact thing the rest of this codebase refuses to
 * print. So the field is not an index: it is five funds that actually trade,
 * each named on its own row, each quoted from the same provider that already
 * quotes the reader's marks.
 *
 * Four of them exist to replicate what hedge funds do — managed futures,
 * multi-strategy, merger arbitrage, equity market neutral — and are the
 * closest thing to a hedge-fund return that can be bought, published daily,
 * and checked by anyone reading the chart. The fifth is the market, because a
 * race with no reference line is a ranking of strangers.
 *
 * Every figure is `yearToDatePriceReturnDaily` from the provider, cached six
 * hours by `indexReturnYtd`. A fund the provider will not quote is dropped
 * from the field rather than drawn at zero, and with fewer than two rows left
 * the whole block is absent. Price return, not total return: distributions are
 * not in the figure, and the screen says so.
 */

export interface Peer {
  symbol: string;
  /** The fund, named. Never "hedge funds" in the aggregate. */
  label: string;
  /** What it does, descriptively. Never a recommendation. */
  note: string;
}

/*
 * The notes sit in a narrow column beside a ticker, so they are three or four
 * words. Anything longer truncates mid-word on a laptop, which is worse than
 * saying less.
 */
export const PEERS: Peer[] = [
  { symbol: "DBMF", label: "DBMF", note: "Managed futures." },
  { symbol: "QAI", label: "QAI", note: "Multi-strategy tracker." },
  { symbol: "MNA", label: "MNA", note: "Merger arbitrage." },
  { symbol: "BTAL", label: "BTAL", note: "Market neutral." },
  { symbol: "SPY", label: "SPY", note: "The S&P 500." },
];

/**
 * Each fund's year to date, as a fraction. Bounded fan-out, six-hour cache,
 * and a fund the provider will not answer for is simply not in the array.
 *
 * Five calls behind a shared cache keyed by symbol rather than by reader, so
 * the whole field costs five requests a day across every account on the
 * deployment rather than five per page view.
 */
export async function peerReturnsYtd(): Promise<RaceEntry[]> {
  const values = await pooled(PEERS, MAX_IN_FLIGHT, (peer) =>
    indexReturnYtd(peer.symbol).catch(() => null),
  );

  const rows: RaceEntry[] = [];
  PEERS.forEach((peer, i) => {
    const value = values[i];
    if (value == null || !Number.isFinite(value)) return;
    rows.push({ key: peer.symbol, label: peer.label, note: peer.note, value });
  });
  return rows;
}
