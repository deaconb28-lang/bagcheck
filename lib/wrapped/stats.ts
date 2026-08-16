import type { RoundTrip } from "@/lib/score";

/**
 * The stats a Wrapped card is allowed to say, computed here and nowhere else.
 *
 * **The model never computes a number.** Every value below is derived in this
 * file from synced brokerage data, rounded here, and formatted here into the
 * exact string the card will show — so what crosses the API boundary is
 * display-ready text and the model's only job is to put it where it goes.
 * A figure a model arrived at is a figure nobody can correct, on an artefact
 * whose entire claim is that its numbers came off a brokerage.
 *
 * Everything is a string because everything is display-ready: "+18.4%", not
 * 18.4. A number that arrives as a number invites reformatting, and
 * reformatting is recomputation with better manners.
 *
 * A value that cannot be computed honestly is `null`, and a card missing any
 * of its tokens is simply not in that reader's set. There is no placeholder
 * and no rounded-up guess: an unearned card is a card that does not exist yet,
 * which is a different thing from a card with a hole in it.
 */
export interface WrappedStats {
  /* Read through `statValue`; every field is a display-ready string or null. */
  [token: string]: string | null;
  USER_NAME: string | null;
  YEAR: string;
  TOTAL_RETURN_PCT: string | null;
  CONTRIBUTION_COUNT: string | null;
  CONTRIBUTION_STREAK_WEEKS: string | null;
  LONGEST_HOLD_TICKER: string | null;
  LONGEST_HOLD_DAYS: string | null;
  BEST_TICKER: string | null;
  BEST_RETURN_PCT: string | null;
  MAX_DRAWDOWN_PCT: string | null;
  RECOVERY_DAYS: string | null;
  BUSIEST_MONTH: string | null;
  TRADE_COUNT_YEAR: string | null;
  RED_DAY_BUYS: string | null;
  TOP_SECTOR: string | null;
  TOP_SECTOR_PCT: string | null;
  HOLDINGS_COUNT: string | null;
  VS_SPY_PCT: string | null;
  ARCHETYPE_NAME: string | null;
  ARCHETYPE_TRAIT: string | null;
  INVESTOR_AGE: string | null;
}

/**
 * The two facts that shape a caption without being printed on the card.
 *
 * `aheadOfIndex` is card 10's whole tone problem: behind the benchmark is a
 * neutral, forward-looking sentence and never an apology, and the model cannot
 * work that out from a signed percentage without being told which side of the
 * line it is on.
 */
export interface WrappedContext {
  aheadOfIndex: boolean | null;
  /** Dollars appear only when the reader has turned them on. Percent-first. */
  showDollars: boolean;
}

export interface StatsInput {
  year: number;
  name: string | null;
  /** Equity curve for the year, oldest first. Drives return and drawdown. */
  equity: Array<{ date: string; value: number }>;
  /** Every closed round trip, for the best name and the longest hold. */
  trips: RoundTrip[];
  /** Ledger rows for the year: buys, sells, contributions. */
  rows: Array<{ date: string; type: string; symbol: string | null; amount: number | null }>;
  /** Session P&L for the year, to find the red days that were bought into. */
  dailyPnl: Array<{ date: string; realised: number }>;
  holdings: Array<{ symbol: string; value: number | null; sector?: string | null }>;
  archetype: { name: string; trait: string } | null;
  investorAge: number | null;
  /** The index's own return over the same window, as a fraction. Null if unknown. */
  indexReturn: number | null;
  showDollars?: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "+18.4%" / "−12.4%". A signed percentage, one decimal, real minus sign. */
export function pct(fraction: number | null): string | null {
  if (fraction == null || !Number.isFinite(fraction)) return null;
  const v = fraction * 100;
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${Math.abs(v).toFixed(1)}%`;
}

/** "24". Counts are never signed and never decimal. */
export function count(n: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return String(Math.round(n));
}

/** The longest run of consecutive ISO weeks that carried a contribution. */
export function contributionStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const weeks = [...new Set(dates.map(isoWeek))].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < weeks.length; i += 1) {
    run = consecutive(weeks[i - 1], weeks[i]) ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** `YYYY-Www`, so two weeks either side of a year boundary still compare. */
function isoWeek(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function consecutive(a: string, b: string): boolean {
  const [ay, aw] = a.split("-W").map(Number);
  const [by, bw] = b.split("-W").map(Number);
  if (ay === by) return bw - aw === 1;
  /* A year rolls over at 52 or 53 weeks; either lands on week 1 of the next. */
  return by - ay === 1 && bw === 1 && aw >= 52;
}

/** Deepest peak-to-trough on the curve, and how many days it took to recover. */
export function drawdown(equity: Array<{ date: string; value: number }>): {
  depth: number | null;
  recoveryDays: number | null;
} {
  if (equity.length < 2) return { depth: null, recoveryDays: null };

  let peak = equity[0].value;
  let peakAt = 0;
  let worst = 0;
  let troughAt = -1;
  let worstPeakAt = 0;

  for (let i = 1; i < equity.length; i += 1) {
    const v = equity[i].value;
    if (v > peak) {
      peak = v;
      peakAt = i;
      continue;
    }
    if (peak <= 0) continue;
    const dip = (v - peak) / peak;
    if (dip < worst) {
      worst = dip;
      troughAt = i;
      worstPeakAt = peakAt;
    }
  }

  if (troughAt < 0 || worst === 0) return { depth: null, recoveryDays: null };

  /*
   * Recovery is measured from the trough to the day the curve reclaims the
   * old peak. A drawdown still open at the end of the window has no recovery
   * figure — reporting the days so far as a recovery would be reporting a
   * thing that has not happened.
   */
  const target = equity[worstPeakAt].value;
  let recovered = -1;
  for (let i = troughAt + 1; i < equity.length; i += 1) {
    if (equity[i].value >= target) {
      recovered = i;
      break;
    }
  }

  return {
    depth: worst,
    recoveryDays:
      recovered < 0
        ? null
        : Math.round(
            (Date.parse(equity[recovered].date) - Date.parse(equity[troughAt].date)) /
              86_400_000,
          ),
  };
}

/** Buys placed on a session whose realised P&L was negative. */
export function redDayBuys(
  rows: StatsInput["rows"],
  dailyPnl: StatsInput["dailyPnl"],
): number {
  const red = new Set(dailyPnl.filter((d) => d.realised < 0).map((d) => d.date));
  return rows.filter(
    (r) => /buy/i.test(r.type) && red.has(r.date.slice(0, 10)),
  ).length;
}

/**
 * Everything the twelve cards can say about one year.
 *
 * Pure. It takes what the derived layer already holds and produces strings —
 * no I/O, no clock, no randomness, so the same ledger produces the same cards
 * on every run and a test can assert every figure.
 */
export function wrappedStats(input: StatsInput): { stats: WrappedStats; context: WrappedContext } {
  const inYear = (d: string) => d.slice(0, 4) === String(input.year);

  const equity = input.equity.filter((p) => inYear(p.date));
  const rows = input.rows.filter((r) => inYear(r.date));
  const trips = input.trips.filter((t) => inYear(t.closeDate));

  /* Return over the window: first mark to last, on the curve we materialised. */
  const first = equity[0]?.value ?? null;
  const last = equity[equity.length - 1]?.value ?? null;
  const totalReturn =
    first != null && last != null && first > 0 ? (last - first) / first : null;

  const contributions = rows.filter((r) => /contribution|deposit|transfer.?in/i.test(r.type));

  const longest = [...trips].sort((a, b) => b.holdDays - a.holdDays)[0] ?? null;

  /*
   * Best by return rather than by dollars. A card that ranked by profit would
   * be a card about position size, and the reader already knows which of their
   * names is biggest.
   */
  const best = [...trips]
    .filter((t) => t.notional > 0)
    .sort((a, b) => b.pnl / b.notional - a.pnl / a.notional)[0] ?? null;

  const dd = drawdown(equity);

  const byMonth = new Map<number, number>();
  for (const r of rows) {
    if (!/buy|sell/i.test(r.type)) continue;
    const m = Number(r.date.slice(5, 7)) - 1;
    byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
  }
  const busiest = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const trades = rows.filter((r) => /buy|sell/i.test(r.type)).length;

  /*
   * Sector needs the broker to have said so. Where it did not, the card is
   * unearned rather than guessed — a sector inferred from a ticker is a
   * lookup table pretending to be a fact about the reader's book.
   */
  const bookValue = input.holdings.reduce((s, h) => s + (h.value ?? 0), 0);
  const sectors = new Map<string, number>();
  for (const h of input.holdings) {
    if (!h.sector) continue;
    sectors.set(h.sector, (sectors.get(h.sector) ?? 0) + (h.value ?? 0));
  }
  const topSector = [...sectors.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const vsIndex =
    totalReturn != null && input.indexReturn != null ? totalReturn - input.indexReturn : null;

  return {
    stats: {
      USER_NAME: input.name?.trim() || null,
      YEAR: String(input.year),
      TOTAL_RETURN_PCT: pct(totalReturn),
      CONTRIBUTION_COUNT: contributions.length ? count(contributions.length) : null,
      CONTRIBUTION_STREAK_WEEKS: contributions.length
        ? count(contributionStreak(contributions.map((c) => c.date)))
        : null,
      LONGEST_HOLD_TICKER: longest?.symbol ?? null,
      LONGEST_HOLD_DAYS: longest ? count(longest.holdDays) : null,
      BEST_TICKER: best?.symbol ?? null,
      BEST_RETURN_PCT: best ? pct(best.pnl / best.notional) : null,
      MAX_DRAWDOWN_PCT: pct(dd.depth),
      RECOVERY_DAYS: count(dd.recoveryDays),
      BUSIEST_MONTH: busiest ? MONTHS[busiest[0]] : null,
      TRADE_COUNT_YEAR: trades ? count(trades) : null,
      RED_DAY_BUYS: count(redDayBuys(rows, input.dailyPnl.filter((d) => inYear(d.date)))),
      TOP_SECTOR: topSector?.[0] ?? null,
      TOP_SECTOR_PCT:
        topSector && bookValue > 0 ? `${((topSector[1] / bookValue) * 100).toFixed(0)}%` : null,
      HOLDINGS_COUNT: input.holdings.length ? count(input.holdings.length) : null,
      VS_SPY_PCT: pct(vsIndex),
      ARCHETYPE_NAME: input.archetype?.name ?? null,
      ARCHETYPE_TRAIT: input.archetype?.trait ?? null,
      INVESTOR_AGE: count(input.investorAge),
    },
    context: {
      aheadOfIndex: vsIndex == null ? null : vsIndex >= 0,
      showDollars: input.showDollars ?? false,
    },
  };
}

/**
 * The cards this reader has earned: the ones whose every token has a value.
 *
 * A card with a hole in it is not a card, and a hole filled with a dash is a
 * card that says the product could not answer — on the surface whose whole job
 * is to be worth posting.
 */
export function earnedCards<T extends { tokens: string[] }>(
  cards: readonly T[],
  stats: WrappedStats,
): T[] {
  return cards.filter((c) =>
    c.tokens.every((t) => {
      const v = stats[t];
      return typeof v === "string" && v.length > 0;
    }),
  );
}
