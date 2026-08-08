import { cached, finnhub, MAX_IN_FLIGHT, pooled } from "./client";
import type { Quote } from "./marks";

/** Finnhub's /quote payload. `c` is current, `pc` previous close. */
interface FinnhubQuote {
  c?: number;
  pc?: number;
}

/**
 * Quotes are cached for a minute. Long enough that a page refresh costs
 * nothing, short enough that a mark is never meaningfully wrong — and the
 * product has no surface where a sixty-second lag matters, because it never
 * reports a price as an event.
 */
const TTL = 60;

export async function quotesFor(symbols: string[]): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  const unique = [...new Set(symbols)].filter(Boolean);
  if (!unique.length) return out;

  const results = await pooled(unique, MAX_IN_FLIGHT, async (symbol) => {
    const data = await cached<FinnhubQuote>(`quote:${symbol}`, TTL, () =>
      finnhub<FinnhubQuote>("quote", { symbol }),
    );
    // Finnhub answers unknown symbols with zeroes rather than an error.
    if (!data || !data.c || data.c <= 0) return null;
    return { symbol, price: data.c, previousClose: data.pc ?? null } satisfies Quote;
  });

  for (const q of results) if (q) out.set(q.symbol, q);
  return out;
}
