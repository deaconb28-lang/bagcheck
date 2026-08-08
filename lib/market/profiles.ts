import { cached, finnhub, MAX_IN_FLIGHT, pooled } from "./client";

export interface CompanyProfile {
  symbol: string;
  name: string | null;
  exchange: string | null;
  industry: string | null;
}

interface FinnhubProfile {
  name?: string;
  exchange?: string;
  finnhubIndustry?: string;
}

/** A company's name is not news. Thirty days is generous and still fresh. */
const TTL = 30 * 24 * 60 * 60;

/**
 * Names for tickers the brokerage only gave us a symbol for. Used to fill a
 * gap, never to overwrite what the brokerage said — the ledger stays the
 * brokerage's account of events.
 */
export async function profilesFor(
  symbols: string[],
): Promise<Map<string, CompanyProfile>> {
  const out = new Map<string, CompanyProfile>();
  const unique = [...new Set(symbols)].filter(Boolean);
  if (!unique.length) return out;

  const results = await pooled(unique, MAX_IN_FLIGHT, async (symbol) => {
    const data = await cached<FinnhubProfile>(`profile:${symbol}`, TTL, () =>
      finnhub<FinnhubProfile>("stock/profile2", { symbol }),
    );
    if (!data?.name) return null;
    return {
      symbol,
      name: data.name,
      exchange: data.exchange ?? null,
      industry: data.finnhubIndustry ?? null,
    } satisfies CompanyProfile;
  });

  for (const p of results) if (p) out.set(p.symbol, p);
  return out;
}
