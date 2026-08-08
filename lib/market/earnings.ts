import { cached, finnhub } from "./client";

export interface EarningsDate {
  symbol: string;
  /** ISO date the company reports. */
  date: string;
  /** "bmo" before open, "amc" after close, when Finnhub says. */
  hour: string | null;
}

interface FinnhubCalendar {
  earningsCalendar?: Array<{ symbol?: string; date?: string; hour?: string }>;
}

const TTL = 12 * 60 * 60;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Earnings dates for names the user actually holds.
 *
 * A calendar date is a fact about the schedule, not a price event, which is
 * why this is the one forward-looking thing the product will show. It says
 * when a company reports and nothing about what might happen.
 */
export async function earningsFor(
  symbols: string[],
  withinDays = 14,
): Promise<EarningsDate[]> {
  const held = new Set(symbols.filter(Boolean));
  if (!held.size) return [];

  const from = iso(new Date());
  const to = iso(new Date(Date.now() + withinDays * 86_400_000));

  // One call for the whole window, then filtered locally — asking per symbol
  // would spend the rate limit on names that are not reporting.
  const data = await cached<FinnhubCalendar>(`earnings:${from}:${to}`, TTL, () =>
    finnhub<FinnhubCalendar>("calendar/earnings", { from, to }),
  );

  return (data?.earningsCalendar ?? [])
    .filter((e) => e.symbol && e.date && held.has(e.symbol))
    .map((e) => ({ symbol: e.symbol!, date: e.date!, hour: e.hour || null }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
