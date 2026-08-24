import { periodReturn, raceField } from "@/lib/returns";
import { returnOnCost } from "@/lib/dayone";
import type { RaceEntry } from "@/lib/returns";
import { archetypeFor } from "@/lib/archetypes";
import { activeStreaks, scoreBand, selfPercentile } from "@/lib/score";
import type { ScoredDay } from "@/lib/score";
import type { HeatDay } from "@/components/idioms";
import type { ScoreComponents } from "@/lib/score";
import type {
  Book,
  DashboardView,
  Facts,
  Mark,
  Pattern,
  Performance,
  RangeKey,
  Read,
  Session,
  Window,
} from "./types";

/**
 * Facts → view. Pure: no I/O, no clock beyond what is handed in, no React.
 *
 * This is the only place that decides what a screen *means* by a figure. A
 * page composes; a component draws; nothing else computes. That separation is
 * the whole architecture — before it, three pages each derived the same
 * quantities inline and disagreed about two of them.
 *
 * Every branch here returns `null` or an empty array where the ledger cannot
 * answer, so "absent rather than estimated" is enforced by the type rather
 * than remembered at each call site.
 */

const DAY = 86_400_000;
const RANGE_LABEL: Record<RangeKey, string> = { "45d": "45D", ytd: "YTD", all: "ALL" };

/** The floor under which a percentage is a coincidence with a decimal point. */
export const RATE_FLOOR = 10;
/** A ratio off three weeks of marks is noise wearing two decimal places. */
const SHARPE_FLOOR = 60;

export function windowFor(range: RangeKey, today: string, oldest: string | null): Window {
  const year = Number(today.slice(0, 4));
  const from =
    range === "ytd"
      ? `${year}-01-01`
      : range === "all"
        ? (oldest ?? "0000-01-01")
        : new Date(Date.parse(`${today}T00:00:00Z`) - 45 * DAY).toISOString().slice(0, 10);

  /*
   * Comparable only when the window opens in the first fortnight of January —
   * a fund's year to date starts on the second, and anything shorter drawn at
   * the same scale is two measurements rather than a comparison.
   */
  const opensInJanuary = from <= `${year}-01-14`;
  const reaches = oldest != null && oldest <= `${year}-01-14`;

  return {
    key: range,
    label: RANGE_LABEL[range],
    from,
    comparable: (range === "ytd" || range === "all") && opensInJanuary && reaches,
  };
}

export function bookFrom(holdings: Facts["holdings"], cash: number | null = null): Book {
  let value = 0;
  let cost = 0;
  let unrealised = 0;
  let winners = 0;
  let priced = 0;
  for (const holding of holdings) {
    value += holding.value ?? 0;
    cost += holding.cost ?? 0;
    /*
     * Summed from each holding's own figure rather than taken as value less
     * cost. A position the broker reports a P&L for but no average purchase
     * price contributes nothing to `cost`, so the subtraction would count its
     * entire market value as gain — the book would read as up by the size of
     * every holding whose cost basis the brokerage withheld.
     */
    if (holding.pnl != null) {
      unrealised += holding.pnl;
      priced += 1;
      if (holding.pnl > 0) winners += 1;
    }
  }
  const ranked = [...holdings].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const topTwo = ranked.slice(0, 2).reduce((sum, holding) => sum + (holding.value ?? 0), 0);

  /*
   * The share is of the *account* — cash plus what it bought — not of the
   * invested book, because "18% in cash" is a statement about the whole and
   * dividing by the invested part alone would overstate it.
   */
  const account = value + (cash ?? 0);

  return {
    positions: holdings.length,
    value,
    cost,
    cash,
    cashShare: cash != null && account > 0 ? cash / account : null,
    unrealised,
    /* Against the cost we actually know, never against a partial one. */
    unrealisedPct: cost > 0 ? (unrealised / cost) * 100 : null,
    winners,
    priced,
    largest: ranked[0]?.symbol ?? null,
    topTwo: value > 0 ? topTwo / value : 0,
  };
}

export function performanceFrom(facts: Facts, window: Window): Performance {
  const curve = facts.curve.filter((mark) => mark.date >= window.from);

  /*
   * The basis is a property of the window, not of the account: a curve that
   * only started carrying cash in June is a book curve for anything reaching
   * back past it. Every mark in the window has to agree, or the return would
   * be measured across a change of basis and read the day cash first appeared
   * as a gain the size of the balance.
   */
  const basis: "account" | "book" =
    curve.length > 0 && curve.every((mark) => mark.withCash) ? "account" : "book";
  const flows = (basis === "account" ? facts.flows.transfers : facts.flows.trades).filter(
    (flow) => flow.date >= window.from,
  );
  const sessions = facts.sessions.filter((session) => session.date >= window.from);
  const trips = facts.trips.filter((trip) => trip.closeDate >= window.from);

  let up = 0;
  let down = 0;
  let realised = 0;
  let peak = 0;
  for (const session of sessions) {
    if (session.amount > 0) up += 1;
    else if (session.amount < 0) down += 1;
    realised += session.amount;
    peak = Math.max(peak, Math.abs(session.amount));
  }

  const wins = trips.filter((trip) => trip.pnl > 0).length;

  return {
    basis,
    ret: periodReturn(curve, flows),
    gain: gainOver(curve, flows),
    sessions,
    up,
    down,
    realised,
    peak: peak || 1,
    winRate: {
      wins,
      trades: trips.length,
      pct: trips.length >= RATE_FLOOR ? Math.round((wins / trips.length) * 100) : null,
    },
    /* Sharpe reads the whole curve, not the window — a ratio is a property of
       a record, and forty-five days of it is not one. */
    sharpe: sharpeOf(facts.curve),
    axis: axisOf(curve),
  };
}

/**
 * What the window made, in dollars: close minus open minus what was bought
 * into it. Reporting the raw change in value would count a purchase as a gain.
 */
function gainOver(curve: Mark[], flows: Array<{ date: string; amount: number }>): number | null {
  if (curve.length < 2) return null;
  const open = curve[0];
  const close = curve[curve.length - 1];
  let net = 0;
  for (const flow of flows) {
    if (flow.date <= open.date || flow.date > close.date) continue;
    net += flow.amount;
  }
  return close.value - open.value - net;
}

/**
 * Annualised Sharpe off the curve's own daily marks: mean over standard
 * deviation, scaled by √252, with the risk-free rate taken as zero — and the
 * screen says so, because folding in a rate we have no source for would make
 * the one figure on the page nobody can check.
 */
function sharpeOf(curve: Mark[]): number | null {
  if (curve.length < SHARPE_FLOOR) return null;
  const returns: number[] = [];
  for (let i = 1; i < curve.length; i += 1) {
    const prev = curve[i - 1].value;
    if (!(prev > 0)) continue;
    returns.push((curve[i].value - prev) / prev);
  }
  if (returns.length < SHARPE_FLOOR) return null;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const sd = Math.sqrt(
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1),
  );
  if (!(sd > 0)) return null;
  const value = (mean / sd) * Math.sqrt(252);
  return Number.isFinite(value) ? value : null;
}

function axisOf(curve: Mark[]): string[] {
  if (curve.length < 2) return [];
  return [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => {
    const mark = curve[Math.min(Math.round(f * (curve.length - 1)), curve.length - 1)];
    const at = new Date(`${mark.date}T00:00:00Z`);
    return Number.isNaN(at.getTime())
      ? mark.date
      : at.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  });
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

/**
 * Every pattern the ledger can prove, in one list, worst first.
 *
 * Three kinds share one shape so a screen can render them in a loop rather
 * than branching per pattern — the dashboard shows the first two and the
 * insights page shows them all, from the same array.
 */
export function patternsFrom(facts: Facts, window: Window): Pattern[] {
  const out: Pattern[] = [];
  const trips = facts.trips;

  /* ── The weekday, when one is clearly worse ── */
  const cells = WEEKDAYS.map((day) => ({ day, amount: 0, trades: 0 }));
  for (const trip of trips) {
    const at = new Date(`${trip.closeDate.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(at.getTime())) continue;
    const index = at.getUTCDay() - 1;
    if (index < 0 || index > 4) continue;
    cells[index].amount += trip.pnl;
    cells[index].trades += 1;
  }
  const traded = cells.filter((cell) => cell.trades > 0);
  if (traded.length >= 3) {
    const worst = traded.reduce((low, cell) => (cell.amount < low.amount ? cell : low));
    if (worst.amount < 0) {
      out.push({
        key: "weekday",
        kind: "weekday",
        title: `${worst.day}days are your worst day`,
        body: `Round trips closed on ${worst.day} have booked ${signed(worst.amount)} across ${worst.trades} ${worst.trades === 1 ? "trip" : "trips"}. Every other weekday sits above it.`,
        impact: worst.amount,
        tone: "loss",
        range: "All",
        chart: { type: "weekday", cells: cells.map((c) => ({ day: c.day, amount: c.amount })), worst: worst.day },
      });
    }
  }

  /* ── The hold asymmetry, in whichever direction it runs ── */
  const { winnersMean, losersMean } = facts.holdTime;
  if (winnersMean != null && losersMean != null && winnersMean > 0 && losersMean > 0) {
    const cuts = losersMean > winnersMean;
    const ratio = cuts ? losersMean / winnersMean : winnersMean / losersMean;
    if (ratio >= 1.1) {
      out.push({
        key: "holds",
        kind: "holds",
        title: cuts
          ? `You cut winners ${ratio.toFixed(1)}× faster`
          : `You hold winners ${ratio.toFixed(1)}× longer`,
        body: `Winners stay in the book ${Math.round(winnersMean)} days on average and losers ${Math.round(losersMean)}. ${
          cuts
            ? "Selling the good ones first is the clearest habit in your ledger."
            : "Letting the good ones run is the clearest habit in your ledger."
        }`,
        impact: null,
        tone: cuts ? "loss" : "moss",
        range: "All",
        chart: { type: "holds", winners: winnersMean, losers: losersMean },
      });
    }
  }

  /* ── Who the ledger says you are ── */
  /*
   * Only when all four are measured. An incomplete profile has no corner of
   * the cube, so it has no name and no line — and a card headed with a
   * confident archetype is the loudest claim on the screen.
   */
  const archetype = archetypeFor((facts.components ?? null) as unknown as ScoreComponents | null);
  if (archetype) {
    out.push({
      key: "profile",
      kind: "profile",
      title: archetype.name,
      body: archetype.line,
      impact: null,
      tone: "moss",
      range: "All",
      chart: {
        type: "profile",
        archetype: archetype.key,
        components: facts.components ?? {},
        age: facts.investorAge,
      },
    });
  }

  /* ── Whatever the engine has on file, worst first ── */
  for (const finding of [...facts.findings].sort(byImpact)) {
    out.push({
      key: finding.key,
      kind: "finding",
      title: finding.sentence,
      body: finding.evidence,
      impact: finding.impact,
      tone: finding.impact != null && finding.impact >= 0 ? "moss" : "loss",
      range: window.label,
      chart: { type: "figure" },
    });
  }

  return out;
}

const byImpact = (a: { impact: number | null }, b: { impact: number | null }) =>
  (a.impact ?? Number.POSITIVE_INFINITY) - (b.impact ?? Number.POSITIVE_INFINITY);

const signed = (value: number) =>
  `${value >= 0 ? "+" : "−"}${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.abs(value))}`;

/**
 * The dashboard, assembled.
 *
 * `peers` and the Wrapped counts arrive from the loader rather than being
 * fetched here, because this file does no I/O — which is what makes every
 * figure on the screen assertable without a database or a network.
 */

/**
 * The book by industry.
 *
 * Only what the provider could actually name. A holding with no sector is left
 * out of the total rather than swept into an "Other" bucket — "Other 38%" is a
 * statement about our data coverage wearing the costume of a statement about
 * the reader's portfolio. `cover` says how much of the book the shares below
 * add up to, so the screen can state its own completeness instead of implying
 * it is total.
 */
export function sectorsFrom(
  holdings: Facts["holdings"],
  sectors: Map<string, string | null>,
): { sectors: DashboardView["sectors"]; sectorsCover: number } {
  const byName = new Map<string, number>();
  let known = 0;
  let all = 0;

  for (const holding of holdings) {
    const value = holding.value ?? 0;
    all += value;
    const name = sectors.get(holding.symbol);
    if (!name || value <= 0) continue;
    known += value;
    byName.set(name, (byName.get(name) ?? 0) + value);
  }

  if (known <= 0) return { sectors: [], sectorsCover: 0 };

  return {
    sectors: [...byName.entries()]
      .map(([name, value]) => ({ name, value, share: value / known }))
      .sort((a, b) => b.value - a.value),
    sectorsCover: all > 0 ? known / all : 0,
  };
}


/**
 * The running total of realised P&L, one point per session.
 *
 * A different question from the columns beside it. `PnlColumns` answers "which
 * days", and cannot answer "where did this end up" — a reader looking at
 * fourteen green columns and eleven red ones has no way to tell whether the
 * year is up. This is the sum, in order.
 *
 * Only sessions, not calendar days: `dailyPnl` is sparse, so the x-axis here is
 * *events* rather than time. That is the honest reading of a cumulative
 * realised line — nothing happens to realised P&L on a day nothing closed, so
 * a flat stretch would be drawing a fact that does not exist.
 */
/**
 * The floor under both new blocks.
 *
 * Eight is the engine's own `MIN_SAMPLE` — the count below which it refuses to
 * report a pattern — and the same reasoning applies to a picture. A cumulative
 * line of three points is not a curve and a calendar of four lit cells is not a
 * year.
 */
export const MIN_SESSIONS = 8;

/**
 * Daily realised P&L as calendar cells.
 *
 * Levels are magnitude against the window's own peak, tone is direction, and a
 * day with no closed session is level 0 — an *empty* cell, not a zero one. That
 * distinction is the whole reason this cannot reuse `heatFromScores`: a day
 * nobody traded is not a flat day, and painting it as one would claim a fact
 * the ledger does not hold.
 *
 * `dailyPnl` is sparse, so most cells in any real year are empty. That is fine
 * for a texture and fatal for a feature — the caller is responsible for not
 * drawing a grid at all below a floor of sessions. A year of grey squares is
 * not a chart.
 */
export function pnlHeat(
  sessions: Array<{ date: string; amount: number }>,
  weeks = 52,
  today = new Date(),
): HeatDay[] {
  const byDate = new Map(sessions.map((s) => [s.date, s.amount]));
  const peak = sessions.reduce((m, s) => Math.max(m, Math.abs(s.amount)), 0) || 1;

  const out: HeatDay[] = [];
  const start = new Date(today.getTime() - (weeks * 7 - 1) * 86_400_000);
  for (let i = 0; i < weeks * 7; i += 1) {
    const day = new Date(start.getTime() + i * 86_400_000);
    const date = day.toISOString().slice(0, 10);
    const amount = byDate.get(date);
    if (amount == null || amount === 0) {
      out.push({ date, level: 0, note: `${date} — nothing closed` });
      continue;
    }
    const share = Math.abs(amount) / peak;
    const level = share > 0.66 ? 4 : share > 0.33 ? 3 : share > 0.1 ? 2 : 1;
    out.push({
      date,
      level: level as 1 | 2 | 3 | 4,
      tone: amount > 0 ? "up" : "down",
      note: `${date} — ${amount > 0 ? "+" : "−"}$${Math.abs(Math.round(amount)).toLocaleString("en-US")}`,
    });
  }
  return out;
}


/**
 * The last N weeks of scored days as cells.
 *
 * The twin of `pnlHeat`, and deliberately not the same function: there a
 * level is the *magnitude* of a day's money against the window's peak and the
 * tone is its direction, here a level is the score banded against fixed bars
 * and there is no direction to carry. Both agree on the one thing that
 * matters — a day with nothing on file is level 0, an empty cell rather than
 * a zero one.
 *
 * `today` is a parameter for the same reason it is on `pnlHeat`: a function
 * that reads the clock cannot be tested.
 */
export function scoreHeat(days: ScoredDay[], weeks = 26, today = new Date()): HeatDay[] {
  const byDate = new Map(days.map((day) => [day.date, day.score]));
  const out: HeatDay[] = [];
  const start = new Date(today.getTime() - (weeks * 7 - 1) * 86_400_000);
  for (let i = 0; i < weeks * 7; i += 1) {
    const date = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    const score = byDate.get(date);
    out.push(
      score == null
        ? { date, level: 0, note: `${date} — not scored` }
        : { date, level: scoreBand(score), note: `${date} — scored ${score}` },
    );
  }
  return out;
}

/**
 * Everything the instrument concluded, assembled once.
 *
 * Absent rather than defaulted at every step, because each of these is a
 * claim about a person: no scored day means no read at all; a streak below
 * its own floor is nothing rather than a run of one; a percentile under five
 * days on file is null rather than a number nobody could check. The functions
 * doing the deciding already existed and were unit-tested and had never once
 * rendered — this is the wiring, not new arithmetic.
 */
export function readFrom(days: ScoredDay[], today = new Date()): Read | null {
  if (!days.length) return null;
  /* Newest first, whatever order the store handed over. */
  const desc = [...days].sort((a, b) => b.date.localeCompare(a.date));
  const latest = desc[0];

  /*
   * The delta is against the oldest of the last seven scored days, not
   * against yesterday. A score moves a point or two a night, so a
   * day-over-day figure is noise wearing the shape of a trend.
   */
  const week = desc.slice(0, 7);
  const delta = week.length >= 2 ? latest.score - week[week.length - 1].score : null;

  const best = desc.reduce((top, day) => (day.score > top.score ? day : top), latest);

  return {
    score: latest.score,
    delta,
    components: latest.components,
    archetype: archetypeFor(latest.components),
    contributors: latest.contributors,
    streaks: activeStreaks(desc),
    percentile: selfPercentile(desc, latest.score),
    /* Only worth stating as a record once there is something to have beaten. */
    best: desc.length >= 5 && best.score > latest.score ? { score: best.score, date: best.date } : null,
    heat: scoreHeat(desc, 26, today),
    scoredDays: desc.length,
  };
}

export function cumulativePnl(sessions: Session[]): Array<{ date: string; total: number }> {
  let total = 0;
  return sessions.map((session) => {
    total += session.amount;
    return { date: session.date, total };
  });
}

export function dashboardView({
  facts,
  range,
  today,
  peers,
  wrapped,
  sectors = new Map(),
}: {
  facts: Facts;
  range: RangeKey;
  today: string;
  peers: RaceEntry[];
  wrapped: { earned: number; total: number; earnedNos: string[] };
  /** Symbol to industry, from the market layer. Empty without a key. */
  sectors?: Map<string, string | null>;
}): DashboardView {
  const window = windowFor(range, today, facts.curve[0]?.date ?? null);
  const book = bookFrom(facts.holdings, facts.cash);
  const performance = performanceFrom(facts, window);

  /*
   * The field is always a year-to-date comparison, whatever chip is selected —
   * the panel says so on its own face, and a fund's year does not change
   * because a reader asked the chart above it for forty-five days. What gates
   * it is whether the *reader's* year is quotable on the same terms, which is
   * a property of the ledger rather than of the chip.
   */
  const year = Number(today.slice(0, 4));
  const yearCurve = facts.curve.filter((mark) => mark.date.slice(0, 4) === String(year));
  const opened = yearCurve[0]?.date ?? null;
  const sameWindow = opened != null && opened <= `${year}-01-14`;
  const yearBasis = yearCurve.length > 0 && yearCurve.every((mark) => mark.withCash);
  const ytd = periodReturn(
    yearCurve,
    (yearBasis ? facts.flows.transfers : facts.flows.trades).filter(
      (flow) => flow.date.slice(0, 4) === String(year),
    ),
  );
  /*
   * The reader is always in their own field.
   *
   * Two earlier passes got this wrong in opposite directions: the first drew
   * no field at all unless the ledger reached January, so a new account never
   * saw the block; the second drew the field and withheld the reader, so a new
   * account watched five funds race without them. Both were trying to avoid
   * setting a part-year figure beside a full-year one without saying so.
   *
   * Saying so is the answer. The reader's row carries the day their curve
   * starts whenever it starts late, the panel repeats it underneath, and the
   * figure is the reader's real return over the window they actually have.
   */
  /*
   * And when there is no year to quote, the reader is still in their own
   * field — on the one basis a first sync can support.
   *
   * A return over a window needs two marks on the curve, which an account
   * that connected today does not have. Return on cost does not: both halves
   * come off the same priced snapshot, so it is real, checkable and available
   * immediately. It is **not the same measurement** as a fund's year — it has
   * no time in it — and the row, the note under the chart and the provenance
   * line all say which basis is on the screen.
   *
   * The alternative was leaving the reader off their own chart for their whole
   * first fortnight, which two earlier passes tried and which is how a page
   * about somebody's account comes to be about five funds instead.
   */
  const onCost = returnOnCost(facts.holdings);
  const field = raceField(
    ytd != null
      ? { value: ytd, since: sameWindow ? null : opened, basis: "ytd" }
      : onCost != null
        ? { value: onCost, basis: "cost" }
        : null,
    peers,
  );
  /*
   * One reason, in the order a reader can act on: no provider key is a
   * deployment fact, too few quotes is a provider fact, and a short year is
   * a fact about the reader's own ledger that time alone fixes.
   */
  const fieldAbsence: DashboardView["fieldAbsence"] = field
    ? null
    : peers.length
      ? "too-few-funds"
      : "market-key";

  const ranked = [...facts.holdings].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const concentration =
    ranked.length >= 2 && book.topTwo >= 0.45
      ? `${ranked[0].symbol} and ${ranked[1].symbol} carry ${Math.round(book.topTwo * 100)}% of your book.`
      : null;

  const archetype =
    archetypeFor((facts.components ?? null) as unknown as ScoreComponents | null)?.name ?? null;

  return {
    window,
    /*
     * The read leads the screen, so it is built first and gated once. A page
     * that receives `null` here draws no hero — it does not draw an empty one.
     */
    read: readFrom(facts.scored, new Date(today)),
    book,
    performance,
    field,
    fieldAbsence,
    /*
     * The account's own value over time.
     *
     * Not P&L and never labelled as it: portfolio value moves when money
     * crosses the account's edge, so a deposit lifts this line exactly like a
     * gain. It is drawn where the cumulative *realised* line cannot be —
     * an account that has never sold has no realised series at all, which is
     * most new accounts — and the surface that draws it says which it is.
     */
    curve: facts.curve.map((mark) => ({ date: mark.date, value: mark.value })),
    index: peers.find((peer) => peer.key === "SPY")?.value ?? null,
    allocation: facts.holdings.map((holding) => ({
      key: holding.symbol,
      label: holding.symbol,
      value: holding.value ?? 0,
      pnlPct: holding.pnlPct ?? null,
    })),
    positions: [...facts.holdings]
      .filter((holding) => (holding.value ?? 0) > 0)
      .sort((a, b) => Math.abs(b.pnl ?? 0) - Math.abs(a.pnl ?? 0))
      .map((holding) => ({
        symbol: holding.symbol,
        name: holding.description,
        /*
         * The provider's industry, kept per name rather than only summed.
         *
         * It was loaded per symbol and immediately aggregated into
         * `sectors`, so the two charts that group the book by theme had
         * nothing to group by. A holding the provider cannot name keeps null
         * and the grouping puts it in its own bucket — never in a guessed one.
         */
        sector: sectors.get(holding.symbol) ?? null,
        value: holding.value ?? 0,
        pnl: holding.pnl,
        pnlPct: holding.pnlPct,
        /*
         * Per unit, because that is what a reader recognises: `cost` off the
         * ledger is the whole basis for the lot, and "710.00 → 1,063.25" is a
         * statement about a share.
         */
        basis:
          holding.cost != null && holding.units ? holding.cost / holding.units : null,
        price: holding.price,
      })),
    concentration,
    /*
     * Gated once, here, rather than in each component. The page then has no
     * decision to make and cannot make a different one from its sibling.
     */
    cumulative:
      performance.sessions.length >= MIN_SESSIONS ? cumulativePnl(performance.sessions) : [],
    /*
     * The calendar takes *every* session, not the window's.
     *
     * It draws a fixed 52 weeks, so feeding it the range-windowed sessions
     * guaranteed an empty grid: at the 45-day default, seven eighths of the
     * cells could not light no matter what the account had done. A year-shaped
     * chart is fed a year. `pnlHeat` lights only what falls inside its own
     * span, so handing it the whole series is both correct and sufficient.
     */
    calendar: facts.sessions.length >= MIN_SESSIONS ? pnlHeat(facts.sessions, 52, new Date(today)) : [],
    ...sectorsFrom(facts.holdings, sectors),
    patterns: patternsFrom(facts, window),
    wrapped: {
      year,
      earned: wrapped.earned,
      total: wrapped.total,
      archetype,
      earnedNos: wrapped.earnedNos,
    },
    provenance: {
      ...facts.provenance,
      /*
       * Which basis the figures stand on, said once. A reader comparing this
       * screen to their brokerage's own total needs to know whether the cash
       * is in it, and a brokerage that will not report a balance is a fact
       * about the connection rather than something to paper over.
       */
      marks: `${facts.provenance.marks} · ${
        performance.basis === "account"
          ? "figures include uninvested cash"
          : "figures are the invested book, cash not reported"
      }`,
    },
    accounts: facts.accounts.length,
    syncedAt: facts.syncedAt,
  };
}

export type { Session };
