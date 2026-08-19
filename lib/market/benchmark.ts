import { cached, finnhub } from "./client";

/**
 * The index's own year, for the one card that compares.
 *
 * Card 10 is the only place in Supercruise that measures the reader against
 * anything other than themselves, and it needs a real number to do it. The
 * obvious source — a year of daily candles — is behind Finnhub's paid tier,
 * and inferring a year's return from a current quote is not possible without
 * one. `stock/metric` carries the return outright on the basic tier, already
 * computed by the data provider, which is both cheaper and less wrong than
 * anything we could reconstruct.
 *
 * Null when the provider will not say. The card is then unearned rather than
 * estimated: a comparison against a benchmark we had to guess at is a
 * comparison that means nothing, on the card whose entire content is the
 * comparison.
 */

interface MetricResponse {
  metric?: Record<string, number | string | null>;
}

/** Six hours. A benchmark's year-to-date does not move fast enough to matter. */
const TTL = 6 * 60 * 60;

/** The default benchmark. SPY because that is what the card names. */
export const BENCHMARK = "SPY";

/**
 * Year-to-date price return as a fraction — 0.184 for +18.4%.
 *
 * Finnhub reports it as a percentage, so it is divided here: the rest of the
 * codebase passes fractions and `pct()` multiplies, and two conventions
 * meeting in the middle is how a card ends up claiming +1840%.
 */
export async function indexReturnYtd(symbol = BENCHMARK): Promise<number | null> {
  const data = await cached<MetricResponse>(`metric:${symbol}:price`, TTL, () =>
    finnhub<MetricResponse>("stock/metric", { symbol, metric: "price" }),
  );

  const raw = data?.metric?.yearToDatePriceReturnDaily;
  const value = typeof raw === "string" ? Number(raw) : raw;
  if (value == null || !Number.isFinite(value)) return null;

  /*
   * A sanity bound. A benchmark year outside ±90% is a provider returning
   * something other than what we asked for, and a card is a bad place to find
   * that out.
   */
  const fraction = value / 100;
  if (Math.abs(fraction) > 0.9) return null;
  return fraction;
}
