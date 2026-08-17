import { getCollections, loadScreen } from "@/lib/db";
import type { ScreenData } from "@/lib/db";
import {
  fieldProvenance,
  isMarketConfigured,
  peerReturnsYtd,
  profilesFor,
  refreshHoldings,
} from "@/lib/market";
import { investmentFlows, transferFlows } from "@/lib/returns";
import { wrappedDeck } from "@/lib/wrapped/year";
import { CARDS } from "@/wrapped/cards.mjs";
import type { Facts, RangeKey } from "./types";
import { dashboardView } from "./view";

/**
 * The only file in the portfolio layer that touches the network or the store.
 *
 * Everything above it is pure. That boundary is deliberate and it is the same
 * one `lib/market` keeps between `marks.ts` and `client.ts`: the arithmetic is
 * testable without a database, and there is exactly one place to look when a
 * screen is slow or a query is wrong.
 *
 * One round of I/O per request. Pages used to open their own collections and
 * run their own queries — `/you` had a transactions query inline in the page
 * file — so three screens against one ledger meant three different sets of
 * reads, and the moment one of them drifted the screens disagreed.
 */

export function rangeOf(raw: string | undefined): RangeKey {
  return raw === "ytd" || raw === "all" ? raw : "45d";
}

/**
 * Everything one sync left behind, plus the two things a request adds: marks
 * refreshed against the market, and the flows that make a return a return.
 */
export async function factsFor(userId: string, data: ScreenData): Promise<Facts> {
  const today = new Date().toISOString().slice(0, 10);
  const asOf = data.snapshots.reduce<string | null>(
    (newest, snapshot) => (!newest || snapshot.date > newest ? snapshot.date : newest),
    null,
  );

  const { transactions } = await getCollections();
  const [refreshed, flowRows] = await Promise.all([
    isMarketConfigured()
      ? refreshHoldings(data.holdings, asOf, today)
      : Promise.resolve({
          rows: data.holdings,
          provenance: `Brokerage synced ${asOf ?? "never"}`,
        }),
    /*
     * Both kinds of flow, in one query. Which one a return nets out depends on
     * what the curve is measuring: a book curve moves when money crosses into
     * a position, an account curve moves when money crosses the account's own
     * edge. The view picks; this only has to fetch.
     */
    transactions
      .find({ userId, type: { $regex: /buy|sell|contribution|deposit|withdrawal|transfer/i } })
      .project<{ date: string; type: string; amount: number | null }>({
        _id: 0,
        date: 1,
        type: 1,
        amount: 1,
      })
      .toArray(),
  ]);

  return {
    trips: data.derived?.roundTrips ?? [],
    sessions: (data.derived?.dailyPnl ?? []).map((day) => ({
      date: day.date,
      amount: day.realised,
    })),
    curve: (data.derived?.equitySeries ?? []).map((point) => ({
      date: point.date,
      value: point.value,
      filled: point.interpolated,
      withCash: point.withCash,
    })),
    flows: { trades: investmentFlows(flowRows), transfers: transferFlows(flowRows) },
    holdTime: data.derived?.holdTime ?? {
      winnersMean: null,
      losersMean: null,
      winners: 0,
      losers: 0,
    },
    findings: data.derived?.findings ?? [],
    holdings: refreshed.rows,
    accounts: data.connection?.accounts ?? [],
    syncedAt: data.connection?.lastSyncAt?.toISOString().slice(0, 10) ?? null,
    provenance: { marks: refreshed.provenance, asOf },
    excluded: data.derived?.excludedSymbols ?? [],
    transactionCount: data.transactionCount,
    scoredDays: data.scores.length,
    investorAge: data.investorAge,
    components: (data.scores[0]?.components ?? null) as unknown as Record<string, number> | null,
  };
}

/**
 * The dashboard, end to end: one screen read, one facts assembly, one pure
 * build. A page calls this and renders — it does not query, and it does not
 * compute.
 *
 * `preloaded` exists because a page may already hold the screen. `/you` reads
 * it first to decide between the dashboard and an empty state, and then called
 * this — which read the whole ledger a second time, every view. That is the
 * failure this layer was built to end, reintroduced one level up: the screen
 * is 400 scores, every snapshot and the connection, and fetching it twice
 * costs exactly twice.
 */
export async function dashboardFor(userId: string, range: RangeKey, preloaded?: ScreenData) {
  const data = preloaded ?? (await loadScreen(userId, 400));
  const today = new Date().toISOString().slice(0, 10);
  const year = Number(today.slice(0, 4));

  const symbols = data.holdings.map((h) => h.symbol).filter(Boolean);

  const [facts, peers, deck, profiles] = await Promise.all([
    factsFor(userId, data),
    /* No key, no field — and no invented one. */
    isMarketConfigured() ? peerReturnsYtd().catch(() => []) : Promise.resolve([]),
    wrappedDeck(userId, year).catch(() => null),
    /*
     * Sectors, through the same six-hour cache keyed by symbol rather than by
     * reader — so two people holding NVDA cost one call, and a screen never
     * spends quota that a previous screen already spent.
     */
    isMarketConfigured()
      ? profilesFor(symbols).catch(() => new Map())
      : Promise.resolve(new Map()),
  ]);

  return {
    data,
    facts,
    view: dashboardView({
      facts,
      range,
      today,
      peers,
      /*
       * Symbol to industry. Empty without a market key, which is what makes
       * the sector block absent rather than wrong on a deployment without one.
       */
      sectors: new Map(
        symbols.map((symbol) => [symbol, profiles.get(symbol)?.industry ?? null]),
      ),
      /*
       * The reader's own cards, never the sample's.
       *
       * `wrappedDeck` falls back to the example deck when nothing has been
       * earned, and this counted whatever came back — so an account with zero
       * cards read "11 of 12 cards · READY" on the promo, and the door it
       * opened said "Nothing has been earned yet". The flag beside the cards
       * is the whole point of the flag.
       */
      wrapped: {
        earned: deck && !deck.example ? deck.cards.length : 0,
        total: (CARDS as unknown[]).length,
      },
    }),
  };
}

/** The field's own provenance line, for the panel that draws it. */
export function fieldLine(funds: number, asOf: string): string {
  return fieldProvenance(funds, asOf);
}
