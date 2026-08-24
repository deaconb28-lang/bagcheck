/**
 * The Wheel — a polar chart where angular width is weight and radial distance
 * from a break-even ring is return on cost.
 *
 * This file is the arithmetic and it is pure: no DOM, no React, no I/O. The
 * component draws what this returns, which is what makes the geometry
 * testable — every defect worth catching here is an off-by-a-degree or a
 * radius that escaped the canvas, and neither is visible in a render until it
 * is badly wrong.
 *
 * ── What it encodes ───────────────────────────────────────────────────────
 *
 *   angular span   position weight, so the angles sum to a whole and the
 *                  chart is self-evidently complete
 *   radial extent  return on cost, signed — a loss reads as *inward*
 *   direction      the sign, drawn as well as coloured, so the reading
 *                  survives greyscale and colour blindness
 *   fill           identity only, one stable value per ticker
 *
 * Radius carries exactly one variable. The eye reads radial *area*, not
 * radial length, so a second quantity in the same channel would mislead in a
 * way no legend can undo.
 */

export interface WheelPosition {
  ticker: string;
  /** Percent of total value. The set should sum to about 100. */
  weight: number;
  /** Percent return on cost basis, signed. */
  ret: number;
  /** Cash is structurally different from a stock that happens to be flat. */
  isCash?: boolean;
}

export interface WheelBenchmark {
  label: string;
  ret: number;
}

/** The geometry constants. Stated once, overridable for a short book. */
export interface WheelBox {
  vb: number;
  r0: number;
  rMin: number;
  rMax: number;
  rLead: number;
  rLabel: number;
  gap: number;
  minSpan: number;
}

export const BOX: WheelBox = {
  vb: 640,
  /*
   * The break-even ring sits below centre-radius on purpose: it leaves 102px
   * outward and 38px inward, and in a long-only book gains run larger than
   * losses. A book carrying shorts or inverse products wants r0 at 200.
   */
  r0: 150,
  /*
   * The innermost pixel a wedge may reach, which is what protects the centre
   * figure. Below about 105 the label has no chord to sit on.
   */
  rMin: 112,
  rMax: 252,
  rLead: 272,
  rLabel: 280,
  /** Degrees of total whitespace between adjacent wedges. */
  gap: 1.3,
  /** A wedge is never drawn thinner than this, or a sliver vanishes. */
  minSpan: 1.2,
};

/* ── Validation ───────────────────────────────────────────────────────────
 *
 * Fail loudly rather than distort silently. Every rule here has a failure
 * mode attached to it: a set that does not sum to 100 draws angles that lie
 * about proportion, and a -100% return is a total loss whose true radius is
 * off the canvas.
 */

export interface WheelWarning {
  kind: "weights" | "clamped" | "too-few" | "too-many";
  detail: string;
}

export interface Validated {
  positions: WheelPosition[];
  total: number;
  warnings: WheelWarning[];
  /** Below 2 the chart means nothing; above 14 the wedges stop being readable. */
  renderable: boolean;
}

export const MIN_POSITIONS = 2;
export const MAX_POSITIONS = 14;
/** A total loss. The true value still reaches the label; only the radius is clamped. */
export const RET_FLOOR = -99.9;

export function validate(input: WheelPosition[]): Validated {
  const warnings: WheelWarning[] = [];

  /* A zero-weight row is a closed lot, not a position. */
  const kept = input.filter((p) => p.weight > 0);

  const positions = kept.map((p) => {
    if (p.ret <= RET_FLOOR) {
      warnings.push({
        kind: "clamped",
        detail: `${p.ticker} is at ${p.ret.toFixed(2)}%, drawn at ${RET_FLOOR}%`,
      });
      return { ...p, ret: RET_FLOOR };
    }
    return p;
  });

  const total = positions.reduce((sum, p) => sum + p.weight, 0);
  if (positions.length && Math.abs(total - 100) > 0.5) {
    warnings.push({ kind: "weights", detail: `weights sum to ${total.toFixed(2)}, normalised` });
  }
  if (positions.length < MIN_POSITIONS) {
    warnings.push({ kind: "too-few", detail: `${positions.length} positions` });
  }
  if (positions.length > MAX_POSITIONS) {
    warnings.push({ kind: "too-many", detail: `${positions.length} positions` });
  }

  return {
    positions,
    total,
    warnings,
    renderable: positions.length >= MIN_POSITIONS && positions.length <= MAX_POSITIONS,
  };
}

/* ── The radial scale ─────────────────────────────────────────────────────
 *
 * Linear, and it stays linear. A log or sqrt radius makes +40% look only
 * modestly further out than +10%, which is the entire reading this chart
 * exists to give.
 */

export interface Scale {
  /** Pixels per percentage point. */
  k: number;
  /** The domain ceiling. Below vMax when an outlier has been truncated. */
  ceil: number;
  vMax: number;
  vMin: number;
  truncated: boolean;
  /** True when k hit its upper clamp: the book has barely moved. */
  magnified: boolean;
}

/** No more than this many pixels per point, or a flat book is all noise. */
export const K_MAX = 40;
/** No fewer, or two different returns land on the same pixel. */
export const K_MIN = 0.35;

/**
 * A value is an outlier candidate above three times the 75th percentile of
 * magnitude — but that alone must not trigger truncation, and the ceiling
 * must not be derived from it.
 *
 * Two things go wrong with the ratio rule on its own. A book of eight names
 * with one at +40% against a p75 of 12.25 trips `vMax > 3 × p75` by a hair,
 * and truncating there spends a drawn discontinuity to reclaim 7% of the
 * radius. And in the other direction, a small book whose outlier is enormous
 * *contaminates its own percentile* — magnitudes of 4, 5, 12 and 400 give a
 * p75 of 109, so the ceiling lands at 327 and the bulk stays crushed against
 * the break-even ring, which is the exact failure truncation exists to fix.
 *
 * So the trigger is stated in the terms that actually matter — pixels of
 * resolution for everything that is not the outlier. Truncate only when the
 * bulk would be squeezed into less than a quarter of the outward radius, and
 * when truncating, put the ceiling at the largest non-outlier so the bulk
 * gets the whole radius rather than a slightly smaller share of nothing.
 */
export const TRUNCATE_RATIO = 3;
/** The bulk must keep at least this share of the outward radius. */
export const BULK_FLOOR = 0.25;

export function solveScale(
  rets: number[],
  benchmarkRet: number | null,
  box: WheelBox = BOX,
): Scale {
  /* The benchmark is in the domain, or its ring escapes the canvas. */
  const bench = benchmarkRet ?? 0;
  const vMax = Math.max(0, ...rets, bench);
  const vMin = Math.min(0, ...rets, bench);

  const magnitudes = rets.map(Math.abs).sort((a, b) => a - b);
  const p75 = percentile(magnitudes, 0.75) || 1;

  /* Everything that is not a candidate outlier, and how much room it gets. */
  const bulk = rets.filter((v) => v <= TRUNCATE_RATIO * p75);
  const bulkMax = bulk.length ? Math.max(0, ...bulk) : 0;
  const truncated = vMax > TRUNCATE_RATIO * p75 && bulkMax > 0 && bulkMax / vMax < BULK_FLOOR;
  /*
   * The ceiling never cuts the benchmark off.
   *
   * Truncating to the largest non-outlier is right for the positions and
   * wrong for the reference ring, which is not a position and is not an
   * outlier: pinned at the outer edge it lands on top of whatever wedge is
   * also at the edge, and "does this wedge cross the line" — the one reading
   * the dashed rings exist to give — stops having an answer.
   */
  const ceil = truncated ? Math.max(bulkMax, bench) : vMax;

  const kOut = ceil > 0 ? (box.rMax - box.r0) / ceil : Infinity;
  const kIn = vMin < 0 ? (box.r0 - box.rMin) / Math.abs(vMin) : Infinity;

  let k = Math.min(kOut, kIn);
  const magnified = k > K_MAX;
  k = Math.max(K_MIN, Math.min(k, K_MAX));

  return { k, ceil, vMax, vMin, truncated, magnified };
}

/** Value → radius, clamped so nothing ever escapes the canvas. */
/** Linear interpolation between ranks, which is what the worked example uses. */
function percentile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

export function radiusFor(v: number, scale: Scale, box: WheelBox = BOX): number {
  const raw = box.r0 + v * scale.k;
  return Math.max(box.rMin, Math.min(box.rMax, raw));
}

/**
 * The inner and outer radius of a wedge.
 *
 * A position at exactly 0.00% would give ri === ro and render as a hairline
 * that disappears at some zoom levels, so it is opened to a 2px band. Cash
 * and a stock that has not moved both land here, and the component tells them
 * apart by fill rather than by shape.
 */
export function radii(ret: number, scale: Scale, box: WheelBox = BOX): [number, number] {
  let ri: number;
  let ro: number;
  if (ret >= 0) {
    ri = box.r0;
    ro = radiusFor(ret, scale, box);
  } else {
    ri = radiusFor(ret, scale, box);
    ro = box.r0;
  }
  if (ro - ri < 2) return [box.r0 - 1, box.r0 + 1];
  return [ri, ro];
}

/**
 * The gain ramp: four shades of moss across the positions that made money.
 *
 * **The shade is a rank, not a magnitude.** That distinction is the whole
 * design. Banding off the value — or off the scale's ceiling — puts the whole
 * book in the bottom two steps the moment one position runs away with it: a
 * book of +7.8, +8.0, +9.4, +10.9, +16.2 and +40.0 rendered three wedges in
 * step one, two in step two and nothing at all in step three, so the ramp
 * said almost nothing about the six positions a reader actually wants to
 * compare. It is the same failure truncation exists to fix, arriving through
 * the colour channel instead of the radius.
 *
 * So the shade says *where this sits among your winners* and the radius says
 * *by how much*. Two different true things, neither contradicting the other,
 * and the ramp is guaranteed to use its own steps. This is the pattern the
 * race already uses — rank as a step down a ramp — rather than a new idea.
 *
 * Equal returns take equal shades: the rank is of the distinct values, so a
 * shade never splits two positions that did the same thing.
 *
 * A loss keeps one value. The hatch already separates it, and a second ramp
 * running inward would be two vocabularies in one chart.
 */
export type GainStep = 1 | 2 | 3 | 4;

export function gainRamp(rets: number[]): (ret: number) => GainStep {
  const gains = [...new Set(rets.filter((v) => v > 0))].sort((a, b) => a - b);
  if (!gains.length) return () => 1;
  if (gains.length === 1) return () => 4;

  return (ret) => {
    if (ret <= 0) return 1;
    const i = gains.indexOf(ret);
    /* A value that is not in the set sits by comparison rather than by index. */
    const rank = i >= 0 ? i : gains.filter((g) => g < ret).length;
    const share = rank / (gains.length - 1);
    if (share >= 0.75) return 4;
    if (share >= 0.5) return 3;
    if (share >= 0.25) return 2;
    return 1;
  };
}

/* ── Angular layout ───────────────────────────────────────────────────────
 *
 * SVG puts 0° at three o'clock and increases clockwise. The wheel starts at
 * twelve, so the sweep begins at -90.
 */

export const START_ANGLE = -90;

export interface Wedge extends WheelPosition {
  a0: number;
  a1: number;
  mid: number;
  /** Share of the circle, before gaps. */
  span: number;
}

export function layout(
  positions: WheelPosition[],
  total: number,
  box: WheelBox = BOX,
): Wedge[] {
  const sum = total || positions.reduce((s, p) => s + p.weight, 0) || 1;
  /* One position owns the whole annulus, and a gap in it would be a seam. */
  const single = positions.length === 1;

  let cursor = START_ANGLE;
  return positions.map((p) => {
    const span = (p.weight / sum) * 360;
    /* Shrink the gap for a sliver so it is never eaten by its own spacing. */
    const gap = single ? 0 : Math.min(box.gap, span * 0.25);
    let a0 = cursor + gap / 2;
    let a1 = cursor + span - gap / 2;

    if (!single && a1 - a0 < box.minSpan) {
      const mid = cursor + span / 2;
      a0 = mid - box.minSpan / 2;
      a1 = mid + box.minSpan / 2;
    }

    cursor += span;
    return { ...p, a0, a1, mid: (a0 + a1) / 2, span };
  });
}

/* ── Reference rings ──────────────────────────────────────────────────────
 *
 * A "nice" step giving four to seven rings across the domain. The zero ring
 * is drawn differently by the component: it is the datum the whole chart is
 * read against and it may never be mistaken for a gridline.
 */

export const NICE_STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];

export function ringValues(vMin: number, vMax: number): number[] {
  const span = vMax - vMin;
  const raw = span / 5.5;
  const step = NICE_STEPS.find((s) => s >= raw) ?? 100;

  const rings: number[] = [];
  for (let v = Math.floor(vMin / step) * step; v <= vMax + 1e-9; v += step) {
    rings.push(Number(v.toFixed(4)));
  }
  /* Zero is the datum and is always drawn, even off-step. */
  if (!rings.some((v) => Math.abs(v) < 1e-9)) rings.push(0);
  return rings.sort((a, b) => a - b);
}

/* ── Labels ───────────────────────────────────────────────────────────────*/

export interface Tag {
  ticker: string;
  side: "left" | "right";
  /** The mid-angle position, before collision resolution. */
  y: number;
  x: number;
  mid: number;
  /** Where the wedge's own outer edge sits, so the leader starts clear of it. */
  outer: number;
}

/**
 * Two-sided force separation.
 *
 * Push down through each column, then pull back up if the last one ran off
 * the bottom — one pass in each direction is enough because the columns are
 * already sorted and every move is monotonic.
 */
export function declutter(tags: Tag[], minGap: number, vb: number): Tag[] {
  const out = tags.map((t) => ({ ...t }));

  for (const side of ["right", "left"] as const) {
    const col = out.filter((t) => t.side === side).sort((a, b) => a.y - b.y);
    if (col.length < 2) continue;

    for (let i = 1; i < col.length; i++) {
      const need = col[i - 1].y + minGap - col[i].y;
      if (need > 0) col[i].y += need;
    }
    for (let i = col.length - 2; i >= 0; i--) {
      const need = col[i].y + minGap - col[i + 1].y;
      if (need > 0) col[i].y -= need;
    }
    for (const t of col) t.y = Math.max(18, Math.min(vb - 18, t.y));
  }

  return out;
}

/* ── Formatting and description ───────────────────────────────────────────*/

export function fmtPct(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(2)}%`;
}

/**
 * The screen-reader description, generated from the data rather than written.
 *
 * A hard-coded sentence is a caption that goes stale the first time the book
 * changes — and the counts here (how many wedges clear the benchmark, how
 * many fall inside break-even) are the chart's actual argument, so they are
 * the thing a reader who cannot see it most needs said.
 */
export function describe(
  positions: WheelPosition[],
  benchmark: WheelBenchmark | null,
): string {
  const invested = positions.filter((p) => !p.isCash);
  const under = invested.filter((p) => p.ret < 0);
  const parts = [
    `${positions.length} position${positions.length === 1 ? "" : "s"}.`,
    "Angular width is portfolio weight; distance beyond the break-even ring is return on cost.",
  ];

  if (benchmark) {
    const past = invested.filter((p) => p.ret > benchmark.ret);
    parts.push(
      past.length
        ? `${past.length === 1 ? "One position" : `${past.length} positions`}, ${list(past.map((p) => p.ticker))}, ${past.length === 1 ? "reaches" : "reach"} past the ${benchmark.label} ring at ${fmtPct(benchmark.ret)}.`
        : `No position reaches past the ${benchmark.label} ring at ${fmtPct(benchmark.ret)}.`,
    );
  }

  parts.push(
    under.length
      ? `${under.length === 1 ? "One position" : `${under.length} positions`}, ${list(under.map((p) => p.ticker))}, ${under.length === 1 ? "falls" : "fall"} inside break-even.`
      : "No position falls inside break-even.",
  );

  return parts.join(" ");
}

function list(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
