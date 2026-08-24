/**
 * The two position charts, and the arithmetic they share.
 *
 * Both group the book by theme and both are read against the same two facts —
 * how much of the account a name is, and how far it is from what it cost. One
 * draws that as bars off a zero line with the prices stated; the other draws
 * it as area. This file is the part that is neither: pure, tested, no DOM.
 *
 * ── What it will not do ───────────────────────────────────────────────────
 *
 * The reference these were built from colours its map by the *week's* return.
 * This deployment cannot compute one: a per-symbol price history means daily
 * candles, which sit behind the market provider's paid tier, and the only
 * per-position figure the ledger holds is return on cost. So the map is
 * coloured by return on cost and the label says so. A week nobody measured is
 * exactly the kind of figure this product does not print.
 */

export interface Position {
  symbol: string;
  name: string | null;
  sector: string | null;
  value: number;
  pnl: number | null;
  pnlPct: number | null;
  /** Average cost per unit. */
  basis: number | null;
  /** The current mark per unit. */
  price: number | null;
}

export interface Row extends Position {
  /** Share of the priced book, 0–1. */
  weight: number;
  /** Return on cost as a fraction. Never null on a drawn row. */
  ret: number;
}

export interface Group {
  /** The provider's industry, upper-cased for the chip. */
  label: string;
  rows: Row[];
  /** The group's share of the book, 0–1. */
  weight: number;
}

/**
 * Where a holding goes when the provider could not name an industry.
 *
 * It is its own group rather than being folded into the largest one or
 * dropped: a name in the wrong theme is a claim the data does not support,
 * and a name that vanishes is worse — the weights would stop summing to the
 * book and every share on the chart would be quietly wrong.
 */
export const UNGROUPED = "UNCLASSIFIED";

/**
 * Group the book by theme.
 *
 * Groups are ordered by their own weight and names inside a group by return,
 * best first — so the eye runs down the themes in order of exposure and
 * across each one in order of outcome. `UNCLASSIFIED` always sorts last
 * whatever its weight, because it is an absence rather than a theme and
 * putting it at the top would make missing data the first thing read.
 */
export function groupByTheme(positions: Position[]): Group[] {
  const priced = positions.filter((p) => p.value > 0 && p.pnlPct != null);
  const total = priced.reduce((sum, p) => sum + p.value, 0);
  if (total <= 0) return [];

  const byTheme = new Map<string, Row[]>();
  for (const p of priced) {
    const label = p.sector ? p.sector.toUpperCase() : UNGROUPED;
    const row: Row = { ...p, weight: p.value / total, ret: (p.pnlPct as number) / 100 };
    const rows = byTheme.get(label);
    if (rows) rows.push(row);
    else byTheme.set(label, [row]);
  }

  return [...byTheme.entries()]
    .map(([label, rows]) => ({
      label,
      rows: [...rows].sort((a, b) => b.ret - a.ret),
      weight: rows.reduce((sum, r) => sum + r.weight, 0),
    }))
    .sort((a, b) => {
      if (a.label === UNGROUPED) return 1;
      if (b.label === UNGROUPED) return -1;
      return b.weight - a.weight;
    });
}

/* ── The bar axis ─────────────────────────────────────────────────────────*/

export interface Axis {
  /** The domain, as fractions. Always straddles zero. */
  min: number;
  max: number;
  /** Tick values, including zero. */
  ticks: number[];
  /** Where zero sits across the plot, 0–1. */
  zero: number;
}

const TICK_STEPS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

/**
 * The axis for the return bars.
 *
 * It is **not symmetric about zero**, and that is deliberate. A long-only book
 * runs further up than down, so mirroring the domain would spend half the
 * plot on empty space to the left of every bar — the reference chart puts
 * zero about a third across for exactly this reason. What is fixed instead is
 * that zero is always *on* the plot and always a tick, because the whole
 * chart is read against it.
 *
 * The ends are rounded out to the tick step so no bar ever touches the edge,
 * which would read as a value that ran off rather than one that stopped.
 */
export function axisFor(rets: number[]): Axis {
  const lo = Math.min(0, ...rets);
  const hi = Math.max(0, ...rets);
  const span = hi - lo || 0.1;

  const step = TICK_STEPS.find((s) => span / s <= 6) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  /* A book with no loser still needs the zero end drawn, or its shortest bar
     starts at the plot edge and reads as zero-length. */
  const from = min === 0 && max === 0 ? -step : min;
  const to = max === from ? from + step : max;

  const ticks: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  if (!ticks.some((v) => Math.abs(v) < 1e-9)) ticks.push(0);

  return {
    min: from,
    max: to,
    ticks: ticks.sort((a, b) => a - b),
    zero: (0 - from) / (to - from),
  };
}

/** Where a value sits across the plot, 0–1. */
export function place(value: number, axis: Axis): number {
  return (Math.max(axis.min, Math.min(axis.max, value)) - axis.min) / (axis.max - axis.min);
}

/**
 * The four steps of the return ramp, by rank within the drawn set.
 *
 * The same reasoning as the wheel's: banding by value collapses the moment
 * one position runs away with it, and a shade that says "where this sits
 * among the others" cannot contradict the bar length beside it. Losses and
 * gains are ranked separately, because they are different questions.
 */
export function ramp(rets: number[]): (ret: number) => 1 | 2 | 3 | 4 {
  const rank = (pool: number[], v: number) => {
    const uniq = [...new Set(pool)].sort((a, b) => Math.abs(a) - Math.abs(b));
    if (uniq.length <= 1) return 4 as const;
    const i = uniq.findIndex((u) => u === v);
    const share = (i < 0 ? 0 : i) / (uniq.length - 1);
    return share >= 0.75 ? 4 : share >= 0.5 ? 3 : share >= 0.25 ? 2 : 1;
  };
  const gains = rets.filter((v) => v > 0);
  const losses = rets.filter((v) => v < 0);
  return (ret) => (ret > 0 ? rank(gains, ret) : ret < 0 ? rank(losses, ret) : 1);
}
