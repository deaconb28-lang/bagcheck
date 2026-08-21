import type { Archetype } from "@/lib/archetypes";
import type { RoundTrip } from "@/lib/score";
import { directionOf, textureOf, unit, type ArtShape } from "@/lib/wrapped/brief";

/**
 * The twelve share cards, and what each one is made of.
 *
 * Pure — nothing here reaches Mongo or SnapTrade. Every field comes from the
 * derived layer, which is itself computed once per sync from the brokerage
 * ledger, so a card cannot claim a number the ledger did not produce.
 *
 * **Each card makes exactly one statement.** A figure, or a spine of beats,
 * or a chart — never two of them stacked. That is the rule everywhere else in
 * the product and it matters most here: a card is read in a feed in about a
 * second, and a card carrying three ideas communicates none of them.
 *
 * **A card that has not been earned returns null.** Not a zero, not a dash,
 * not a greyed-out version — absent. Every kind states its own sample floor,
 * and below it there is no card, because a statistic drawn from four round
 * trips is a coincidence with a number on it.
 *
 * Rarity is a fact about the behaviour and never about the tier. Nothing
 * about billing reaches this file.
 */

export type CardKind =
  | "health"
  | "archetype"
  | "longestHold"
  | "holdRatio"
  | "noPanic"
  | "streak"
  | "bestDecision"
  | "drawdownHeld"
  | "cadence"
  | "monthlyPnl"
  | "equity"
  | "correlation"
  | "wrapped";

export type CardHue = "moss" | "ember" | "azure" | "violet";

/**
 * The six card templates.
 *
 * A closed set, and each kind is assigned the one that suits what it is
 * saying — twelve cards in one template is a series, and a series is what
 * people scroll past. They differ in composition *and* in voice: `poster` and
 * `numeral` are set in the condensed poster face, `stamp` and `editorial` in
 * the display serif, `ledger` in mono, `chartfirst` in the body sans at
 * weight. Four voices, all from faces the product already loads — no fifth
 * family, and none of them assigned at random.
 *
 * - `poster`     kicker over a huge headline, statement at the foot
 * - `numeral`    the figure *is* the card; the headline demotes to a caption
 * - `stamp`      centred, serif, no bleed — a certificate rather than a poster
 * - `editorial`  scene on top, type in a band beneath it
 * - `ledger`     no scene at all; flat field, mono, instrument-like
 * - `chartfirst` the series on top, the reading under it
 */
export type CardLayout = "poster" | "numeral" | "stamp" | "editorial" | "ledger" | "chartfirst";

export type CardBody =
  /** One number, and what it measures. The quietest card and usually the best. */
  | { kind: "figure"; label: string; value: string; unit?: string }
  /** Up to three supporting rows. For a card whose point is a decomposition. */
  | { kind: "beats"; beats: Array<{ label: string; detail: string }> }
  /** A series. For a card whose point is a shape over time. */
  | { kind: "chart"; label: string; value: string; unit?: string; strip: number[]; labels?: string[] };

export interface CardSpec {
  kind: CardKind;
  eyebrow: string;
  /** Small word above the headline. */
  kicker: string;
  /** One word, set enormous. */
  headline: string;
  /** One short sentence. Descriptive, never a benchmark. */
  lede: string;
  body: CardBody;
  hue: CardHue;
  layout: CardLayout;
  /**
   * The four measured quantities that shape this card's generated art.
   *
   * Computed here, from the same figures the card states, so the picture and
   * the number cannot drift apart — and so `lib/wrapped/brief.ts` never has
   * to reach back into the ledger to draw anything.
   */
  art: ArtShape;
  rarity: "rare" | null;
  /** The instrument the card is about, when it is about one. */
  symbol: string | null;
}

/** Everything the twelve kinds read. All of it derived from the ledger. */
export interface CardInput {
  year: number;
  score: number | null;
  /** Null until all four components are measured; the archetype card is then unearned. */
  archetype: Archetype | null;
  /** Component scores, for the archetype card's decomposition. */
  components: Record<string, number> | null;
  trips: RoundTrip[];
  holdTime: {
    winnersMean: number | null;
    losersMean: number | null;
    winners: number;
    losers: number;
  };
  /** Realised P&L per session, oldest first. */
  dailyPnl: Array<{ date: string; realised: number }>;
  /** Forward-filled account value, oldest first. */
  equity: Array<{ date: string; value: number }>;
  scoredDays: number;
  transactionCount: number;
  panicSells: number;
  streakDays: number;
  streakName: string;
  /**
   * Conviction return means (%), from the tag join. Null (or absent) when
   * the tag loop has not yet produced both buckets — the correlation card
   * is tag-earned, which is what makes it the rarest thing here.
   */
  conviction?: { highMean: number; lowMean: number; highN: number; lowN: number } | null;
  /** Sessions per week over the recent window, oldest first. */
  weeklySessions: number[];
}

/* ── Sample floors. Below these a card is absent, not empty. ───────────── */
const FLOOR = {
  /** A hold is only notable once it has outlived a normal one. */
  hold: 30,
  /** Comparing winners to losers needs both sides to exist several times. */
  holdRatio: 8,
  /** "No panic sells" only means something across a real span. */
  quarter: 60,
  streak: 14,
  /** A drawdown you held has to be a drawdown. */
  drawdown: 10,
  /** A cadence claim needs enough weeks to have a cadence. */
  cadence: 8,
  /** A month-by-month chart needs months. */
  months: 4,
  /** An equity curve is not a curve at ten points. */
  equity: 30,
  /** Wrapped is annual by construction. */
  wrapped: 180,
} as const;

/* ── Rarity thresholds. Scarce conduct, never a purchase. ──────────────── */
const RARE = {
  health: 92,
  hold: 365,
  holdRatio: 3,
  streak: 90,
  drawdown: 20,
} as const;

const NUM = new Intl.NumberFormat("en-US");
const money = (n: number) => `${n < 0 ? "−" : ""}$${NUM.format(Math.abs(Math.round(n)))}`;
const days = (n: number) => (n < 10 ? n.toFixed(1) : String(Math.round(n)));

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * Every card the history currently earns, strongest statement first.
 *
 * Order is the order a reader should meet them: who you are, then the
 * single most striking number, then the rest.
 */
export function buildCards(input: CardInput): CardSpec[] {
  return [
    archetypeCard,
    healthCard,
    longestHoldCard,
    holdRatioCard,
    noPanicCard,
    streakCard,
    bestDecisionCard,
    drawdownHeldCard,
    cadenceCard,
    monthlyPnlCard,
    equityCard,
    correlationCard,
    wrappedCard,
  ]
    .map((build) => build(input))
    .filter((card): card is CardSpec => card !== null);
}

export function cardOfKind(input: CardInput, kind: CardKind): CardSpec | null {
  return buildCards(input).find((c) => c.kind === kind) ?? null;
}

/* ── The thirteen ──────────────────────────────────────────────────────── */

/**
 * Conviction, priced — the engine's most-quoted artefact. It only exists
 * when months of tagged entries have closed on both sides of the bar and
 * high conviction actually paid, which no brokerage feed can fake.
 */
function correlationCard(i: CardInput): CardSpec | null {
  const c = i.conviction;
  if (!c) return null;
  // The clean multiple is the card. An inverted gradient is a finding for
  // Patterns to name, not a poster to wear.
  if (!(c.highMean > 0 && c.lowMean > 0.2)) return null;
  const ratio = c.highMean / c.lowMean;
  if (ratio < 1.5) return null;
  return {
    kind: "correlation",
    eyebrow: "Supercruise · conviction",
    kicker: "Conviction",
    headline: "Decay",
    lede: `High-conviction entries returned ${ratio.toFixed(1)}× your low-conviction entries.`,
    body: {
      kind: "figure",
      label: "High against low conviction",
      value: ratio.toFixed(1),
      unit: "×",
    },
    hue: "azure",
    layout: "numeral",
    art: {
      magnitude: unit(ratio / 4),
      direction: "up",
      texture: textureOf(i.equity.map((p) => p.value)),
      density: c.highN + c.lowN,
    },
    rarity: "rare",
    symbol: null,
  };
}

/** Who the ledger says you are, decomposed into the components that said it. */
function archetypeCard(i: CardInput): CardSpec | null {
  if (!i.components || !i.archetype) return null;
  const order = ["adherence", "consistency", "patience", "exposure"] as const;
  return {
    kind: "archetype",
    eyebrow: "Supercruise · archetype",
    kicker: "The",
    headline: i.archetype.name.replace(/^The /, ""),
    lede: i.archetype.line,
    body: {
      kind: "beats",
      beats: order
        .slice()
        .sort((a, b) => (i.components![b] ?? 0) - (i.components![a] ?? 0))
        .slice(0, 3)
        .map((key) => ({
          label: key,
          detail: `${Math.round(i.components![key] ?? 0)} out of 100`,
        })),
    },
    art: {
      // How much of the profile clears the bar, how uneven the four are.
      magnitude: i.archetype.strong.length / 4,
      direction: i.archetype.strong.length >= 2 ? "up" : "flat",
      texture: textureOf(order.map((k) => i.components![k] ?? 0)),
      density: 4,
    },
    layout: "poster",
    hue: i.archetype.strong.length >= 3 ? "ember" : i.archetype.strong.length ? "moss" : "violet",
    rarity: i.archetype.strong.length === 4 ? "rare" : null,
    symbol: null,
  };
}

/** The number the whole product is about. */
function healthCard(i: CardInput): CardSpec | null {
  if (i.score == null) return null;
  return {
    kind: "health",
    eyebrow: "Supercruise · health",
    kicker: "Health",
    headline: "Score",
    lede: "Scored against your own baseline, not against a model investor.",
    body: { kind: "figure", label: "Health today", value: String(i.score), unit: "/100" },
    art: {
      // 60 is the bar a component has to clear; 100 is the ceiling.
      magnitude: unit((i.score - 40) / 60),
      direction: i.score >= 60 ? "up" : "down",
      texture: i.components ? textureOf(Object.values(i.components)) : 0.3,
      density: i.scoredDays,
    },
    layout: "numeral",
    hue: "moss",
    rarity: i.score >= RARE.health ? "rare" : null,
    symbol: null,
  };
}

/** The single position you sat on longest. */
function longestHoldCard(i: CardInput): CardSpec | null {
  const longest = i.trips.reduce<RoundTrip | null>(
    (best, t) => (!best || t.holdDays > best.holdDays ? t : best),
    null,
  );
  if (!longest || longest.holdDays < FLOOR.hold) return null;
  const held = Math.round(longest.holdDays);
  return {
    kind: "longestHold",
    eyebrow: `Supercruise · ${i.year}`,
    kicker: "Longest",
    headline: "Hold",
    lede: `${held} days on ${longest.symbol}. Longer than you have held anything else.`,
    body: { kind: "figure", label: "Days held", value: String(held), unit: "days" },
    art: {
      // A year is where a hold stops being long and becomes remarkable.
      magnitude: unit(held / RARE.hold),
      direction: longest.pnl >= 0 ? "up" : "down",
      texture: 0.15,
      density: i.trips.length,
    },
    layout: "numeral",
    hue: "ember",
    rarity: held >= RARE.hold ? "rare" : null,
    symbol: longest.symbol,
  };
}

/** Whether you run winners and cut losers, or the other way round. */
function holdRatioCard(i: CardInput): CardSpec | null {
  const { winnersMean, losersMean, winners, losers } = i.holdTime;
  if (winners < FLOOR.holdRatio || losers < FLOOR.holdRatio) return null;
  if (!winnersMean || !losersMean || losersMean < 0.5) return null;

  const ratio = winnersMean / losersMean;
  const runs = ratio >= 1;
  return {
    kind: "holdRatio",
    eyebrow: "Supercruise · hold time",
    kicker: runs ? "Winners" : "Losers",
    headline: runs ? "Run" : "Linger",
    lede: runs
      ? `You hold what works ${ratio.toFixed(1)}× longer than what does not.`
      : `You hold what is not working ${(1 / ratio).toFixed(1)}× longer than what is.`,
    body: {
      kind: "beats",
      beats: [
        { label: "Winners", detail: `${days(winnersMean)} days, across ${winners}` },
        { label: "Losers", detail: `${days(losersMean)} days, across ${losers}` },
      ],
    },
    art: {
      magnitude: unit((runs ? ratio : 1 / ratio) / RARE.holdRatio),
      direction: runs ? "up" : "down",
      texture: 0.4,
      density: winners + losers,
    },
    layout: "ledger",
    hue: runs ? "moss" : "azure",
    rarity: ratio >= RARE.holdRatio ? "rare" : null,
    symbol: null,
  };
}

/** A span with nothing sold in a panic. */
function noPanicCard(i: CardInput): CardSpec | null {
  if (i.scoredDays < FLOOR.quarter || i.panicSells !== 0) return null;
  return {
    kind: "noPanic",
    eyebrow: "Supercruise · conduct",
    kicker: "Zero",
    headline: "Panic",
    lede: `Not one panic sell across ${i.scoredDays} scored sessions.`,
    body: { kind: "figure", label: "Panic sells", value: "0" },
    art: {
      // The longer the span with nothing sold in a panic, the stiller it is.
      magnitude: unit(i.scoredDays / 250),
      direction: "flat",
      texture: 0,
      density: i.scoredDays,
    },
    layout: "stamp",
    hue: "moss",
    // Scarce by construction: a quarter without one is unusual.
    rarity: "rare",
    symbol: null,
  };
}

/** Consecutive sessions inside your own rules. */
function streakCard(i: CardInput): CardSpec | null {
  if (i.streakDays < FLOOR.streak) return null;
  return {
    kind: "streak",
    eyebrow: "Supercruise · streak",
    kicker: "Current",
    headline: "Streak",
    lede: `${i.streakName}, and it has not broken.`,
    body: { kind: "figure", label: "Consecutive sessions", value: String(i.streakDays), unit: "days" },
    art: {
      magnitude: unit(i.streakDays / RARE.streak),
      direction: "up",
      texture: 0.1,
      density: i.streakDays,
    },
    layout: "poster",
    hue: "ember",
    rarity: i.streakDays >= RARE.streak ? "rare" : null,
    symbol: null,
  };
}

/** The best round trip you actually closed. */
function bestDecisionCard(i: CardInput): CardSpec | null {
  const best = i.trips.reduce<RoundTrip | null>(
    (top, t) => (!top || t.pnl > top.pnl ? t : top),
    null,
  );
  if (!best || best.pnl <= 0) return null;
  return {
    kind: "bestDecision",
    eyebrow: "Supercruise · decisions",
    kicker: "Best",
    headline: "Call",
    lede: `${best.symbol}, held ${days(best.holdDays)} days and closed.`,
    body: { kind: "figure", label: "Realised", value: money(best.pnl) },
    art: {
      // Against the largest trip in the book, so the scale is the person's own.
      magnitude: unit(best.pnl / Math.max(...i.trips.map((t) => Math.abs(t.pnl)), 1)),
      direction: "up",
      texture: 0.3,
      density: i.trips.length,
    },
    layout: "editorial",
    hue: "moss",
    rarity: null,
    symbol: best.symbol,
  };
}

/**
 * The deepest peak-to-trough your account went through without you selling
 * out of it. Read from the equity series, so it is a fact rather than a claim.
 */
function drawdownHeldCard(i: CardInput): CardSpec | null {
  if (i.equity.length < FLOOR.equity) return null;
  let peak = -Infinity;
  let worst = 0;
  for (const point of i.equity) {
    peak = Math.max(peak, point.value);
    if (peak > 0) worst = Math.max(worst, ((peak - point.value) / peak) * 100);
  }
  if (worst < FLOOR.drawdown) return null;
  return {
    kind: "drawdownHeld",
    eyebrow: "Supercruise · drawdown",
    kicker: "Held",
    headline: "Through",
    lede: "The deepest your account fell from its own high, and you stayed in it.",
    body: { kind: "figure", label: "Peak to trough", value: `−${worst.toFixed(0)}`, unit: "%" },
    art: {
      magnitude: unit(worst / (RARE.drawdown * 2)),
      direction: "down",
      texture: textureOf(i.equity.map((p) => p.value)),
      density: i.equity.length,
    },
    layout: "stamp",
    hue: "azure",
    rarity: worst >= RARE.drawdown ? "rare" : null,
    symbol: null,
  };
}

/** How little your trading rhythm moves, week to week. */
function cadenceCard(i: CardInput): CardSpec | null {
  const weeks = i.weeklySessions.slice(-12);
  if (weeks.length < FLOOR.cadence) return null;
  const mean = weeks.reduce((a, b) => a + b, 0) / weeks.length;
  if (mean <= 0) return null;
  return {
    kind: "cadence",
    eyebrow: "Supercruise · cadence",
    kicker: "Weekly",
    headline: "Rhythm",
    lede: `About ${mean.toFixed(1)} sessions a week, across ${weeks.length} weeks.`,
    body: {
      kind: "chart",
      label: "Sessions per week",
      value: mean.toFixed(1),
      strip: weeks,
    },
    art: {
      magnitude: unit(mean / 10),
      direction: directionOf(weeks),
      // A rhythm that holds is smooth; one that lurches is not.
      texture: textureOf(weeks),
      density: weeks.reduce((a, b) => a + b, 0),
    },
    layout: "ledger",
    hue: "azure",
    rarity: null,
    symbol: null,
  };
}

/** Realised P&L, month by month. */
function monthlyPnlCard(i: CardInput): CardSpec | null {
  const byMonth = new Map<string, number>();
  for (const day of i.dailyPnl) {
    const key = day.date.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + day.realised);
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  if (months.length < FLOOR.months) return null;

  const total = months.reduce((sum, [, v]) => sum + v, 0);
  const green = months.filter(([, v]) => v > 0).length;
  return {
    kind: "monthlyPnl",
    eyebrow: `Supercruise · ${i.year}`,
    kicker: "Realised",
    headline: "Months",
    lede: `${green} of ${months.length} months closed green.`,
    body: {
      kind: "chart",
      label: "Realised across the window",
      value: money(total),
      strip: months.map(([, v]) => v),
      labels: months.map(([m]) => MONTHS[Number(m.slice(5, 7)) - 1] ?? ""),
    },
    art: {
      magnitude: unit(green / months.length),
      direction: total > 0 ? "up" : total < 0 ? "down" : "flat",
      texture: textureOf(months.map(([, v]) => v)),
      density: months.length,
    },
    layout: "chartfirst",
    hue: total >= 0 ? "moss" : "azure",
    rarity: null,
    symbol: null,
  };
}

/** The account curve itself — the shape, not the number. */
function equityCard(i: CardInput): CardSpec | null {
  if (i.equity.length < FLOOR.equity) return null;
  const points = sample(i.equity.map((p) => p.value), 12);
  const first = points[0];
  const last = points[points.length - 1];
  if (!first) return null;
  return {
    kind: "equity",
    eyebrow: "Supercruise · equity",
    kicker: "Account",
    headline: "Curve",
    lede: `${i.equity.length} days of account value, forward-filled from your brokerage.`,
    body: {
      kind: "chart",
      label: "Latest value",
      value: money(last),
      /*
       * Plotted against the window's own floor, not against zero: an equity
       * curve drawn from zero is twelve bars of the same height, which says
       * nothing about the year it is describing.
       */
      strip: points.map((v) => v - Math.min(...points)),
    },
    art: {
      magnitude: unit(Math.abs(last - first) / Math.max(Math.abs(first), 1)),
      direction: directionOf(points),
      texture: textureOf(points),
      density: i.equity.length,
    },
    layout: "chartfirst",
    hue: last >= first ? "moss" : "azure",
    rarity: null,
    symbol: null,
  };
}

/** The year. */
function wrappedCard(i: CardInput): CardSpec | null {
  if (i.scoredDays < FLOOR.wrapped) return null;
  return {
    kind: "wrapped",
    eyebrow: `Supercruise · ${i.year}`,
    kicker: "Your",
    headline: String(i.year),
    lede: `${i.scoredDays} scored sessions across ${NUM.format(i.transactionCount)} transactions.`,
    /*
     * The three names you actually closed the most of, ranked — the same move
     * Wrapped makes when it leads with your artists rather than your minutes.
     * Falls back to the year's own counts when nothing has been closed.
     */
    body: {
      kind: "beats",
      beats: topSymbols(i.trips, 3).length
        ? topSymbols(i.trips, 3).map((s, n) => ({
            label: `#${n + 1} ${s.symbol}`,
            detail: `${s.count} round ${s.count === 1 ? "trip" : "trips"}, ${days(s.holdDays)} days held`,
          }))
        : [
            { label: "Transactions read", detail: `${NUM.format(i.transactionCount)}, none of them typed` },
            { label: "Round trips closed", detail: String(i.trips.length) },
            ...(i.archetype ? [{ label: "Reading as", detail: i.archetype.name }] : []),
          ],
    },
    art: {
      magnitude: unit(i.scoredDays / 260),
      direction: "up",
      texture: textureOf(i.dailyPnl.map((d) => d.realised)),
      density: i.transactionCount,
    },
    layout: "editorial",
    hue: "violet",
    // Scarce by construction — a year of history is what earns it.
    rarity: "rare",
    symbol: topSymbols(i.trips, 1)[0]?.symbol ?? null,
  };
}

/**
 * The names you closed the most round trips in, ranked.
 *
 * By count and then by total time held, not by P&L — this is "what you spent
 * the year on", which is the question Wrapped answers, and ranking it by
 * profit would turn a retrospective into a leaderboard.
 */
export function topSymbols(
  trips: RoundTrip[],
  limit: number,
): Array<{ symbol: string; count: number; holdDays: number }> {
  const by = new Map<string, { symbol: string; count: number; holdDays: number }>();
  for (const trip of trips) {
    if (!trip.symbol) continue;
    const row = by.get(trip.symbol) ?? { symbol: trip.symbol, count: 0, holdDays: 0 };
    row.count += 1;
    row.holdDays += trip.holdDays;
    by.set(trip.symbol, row);
  }
  return [...by.values()]
    .sort((a, b) => b.count - a.count || b.holdDays - a.holdDays)
    .slice(0, limit);
}

/** Evenly spaced points from a longer series, keeping both ends. */
function sample(values: number[], count: number): number[] {
  if (values.length <= count) return values;
  const step = (values.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => values[Math.round(i * step)]);
}
