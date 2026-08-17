import { isMarketConfigured } from "./client";
import { BENCHMARK, indexReturnYtd } from "./benchmark";
import { PEERS, peerReturnsYtd } from "./peers";

/**
 * Whether the market provider is actually answering.
 *
 * Every call into this layer is wrapped in `.catch(() => null)` — deliberately,
 * because a quote is a backcheck on the brokerage and a provider outage must
 * never take a screen down. The cost of that is silence: an unset key, a
 * rejected key and a provider having a bad afternoon all look identical from
 * the outside, and the only visible symptom is a block that quietly stops
 * being drawn.
 *
 * That is exactly how every SnapTrade sync came to fail 401 for an unknown
 * stretch with nothing above the log line to say so. So the same question gets
 * the same treatment: ask once per scheduled run, and put the answer where the
 * job's other counters already are.
 *
 * It costs nothing to ask. Both calls go through the shared six-hour cache
 * keyed by symbol rather than by reader, so a check every fifteen minutes is
 * four provider calls a day across the whole deployment.
 */
export interface MarketCheck {
  configured: boolean;
  /** The benchmark's year to date, or null if it could not be quoted. */
  index: number | null;
  /** How many of the roster the provider would quote. */
  funds: number;
  ofFunds: number;
  detail: string;
}

export async function marketCheck(): Promise<MarketCheck> {
  if (!isMarketConfigured()) {
    return {
      configured: false,
      index: null,
      funds: 0,
      ofFunds: PEERS.length,
      detail: "FINNHUB_API_KEY is not set — the field is absent by design",
    };
  }

  const [index, peers] = await Promise.all([
    indexReturnYtd().catch(() => null),
    peerReturnsYtd().catch(() => []),
  ]);

  const funds = peers.length;
  /*
   * The two failures worth telling apart. Nothing quoted at all is a key the
   * provider is rejecting; some quoted is the roster degrading the way it is
   * built to — a fund the provider will not price is dropped, never drawn at
   * zero.
   */
  const detail =
    index == null && funds === 0
      ? "the provider quoted nothing — the key is wrong, rate-limited, or the provider is down"
      : funds < PEERS.length
        ? `${BENCHMARK} quoted; ${PEERS.length - funds} of ${PEERS.length} funds would not price and are dropped`
        : "the provider answered for the benchmark and every fund";

  return { configured: true, index, funds, ofFunds: PEERS.length, detail };
}
