import { periodReturn, raceField } from "@/lib/returns";
import type { RaceEntry } from "@/lib/returns";
import { archetypeFor } from "@/lib/archetypes";
import type { ScoreComponents } from "@/lib/score";
import type {
  Book,
  DashboardView,
  Facts,
  Mark,
  Pattern,
  Performance,
  RangeKey,
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
const RATE_FLOOR = 10;
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

export function bookFrom(holdings: Facts["holdings"]): Book {
  let value = 0;
  let cost = 0;
  let winners = 0;
  for (const holding of holdings) {
    value += holding.value ?? 0;
    cost += holding.cost ?? 0;
    if ((holding.pnlPct ?? 0) > 0) winners += 1;
  }
  const ranked = [...holdings].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const topTwo = ranked.slice(0, 2).reduce((sum, holding) => sum + (holding.value ?? 0), 0);
  const unrealised = value - cost;

  return {
    positions: holdings.length,
    value,
    cost,
    unrealised,
    unrealisedPct: cost > 0 ? (unrealised / cost) * 100 : null,
    winners,
    largest: ranked[0]?.symbol ?? null,
    topTwo: value > 0 ? topTwo / value : 0,
  };
}

export function performanceFrom(facts: Facts, window: Window): Performance {
  const curve = facts.curve.filter((mark) => mark.date >= window.from);
  const flows = facts.flows.filter((flow) => flow.date >= window.from);
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
  if (facts.components) {
    const archetype = archetypeFor(facts.components as unknown as ScoreComponents);
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
        components: facts.components,
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
export function dashboardView({
  facts,
  range,
  today,
  peers,
  wrapped,
}: {
  facts: Facts;
  range: RangeKey;
  today: string;
  peers: RaceEntry[];
  wrapped: { earned: number; total: number };
}): DashboardView {
  const window = windowFor(range, today, facts.curve[0]?.date ?? null);
  const book = bookFrom(facts.holdings);
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
  const ytd = periodReturn(
    yearCurve,
    facts.flows.filter((flow) => flow.date.slice(0, 4) === String(year)),
  );
  const field = sameWindow ? raceField(ytd, peers) : null;

  const ranked = [...facts.holdings].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const concentration =
    ranked.length >= 2 && book.topTwo >= 0.45
      ? `${ranked[0].symbol} and ${ranked[1].symbol} carry ${Math.round(book.topTwo * 100)}% of your book.`
      : null;

  const archetype = facts.components
    ? archetypeFor(facts.components as unknown as ScoreComponents).name
    : null;

  return {
    window,
    book,
    performance,
    field,
    index: peers.find((peer) => peer.key === "SPY")?.value ?? null,
    allocation: facts.holdings.map((holding) => ({
      key: holding.symbol,
      label: holding.symbol,
      value: holding.value ?? 0,
    })),
    concentration,
    patterns: patternsFrom(facts, window),
    wrapped: { year, earned: wrapped.earned, total: wrapped.total, archetype },
    provenance: facts.provenance,
    accounts: facts.accounts.length,
    syncedAt: facts.syncedAt,
  };
}

export type { Session };
