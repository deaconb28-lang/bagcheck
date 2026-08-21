/**
 * ── The book as a heatmap ──
 *
 * A squarified treemap: every holding is a tile, its **area** is its share of
 * the book, and its **colour** is what it has done. That is two readings in one
 * object, and neither is carried by hue alone — size says how much of the
 * account is riding on a name, the figure inside says the return in type, and
 * the fill says the direction the way `--moss` and `--loss` say it everywhere
 * else in this product.
 *
 * It replaces the allocation ring, which could only ever answer "how much" —
 * and answered it with a colour ramp that had to be exempted from the
 * one-hue-one-meaning rule to do so, because a pie needs a colour per slice.
 * A treemap needs none: order and area carry "which", so hue is free to go
 * back to meaning money.
 *
 * The algorithm is Bruls, Huizing and van Wijk's squarify — greedily fill a
 * row along the shorter side while the worst aspect ratio in it improves, then
 * lay it down and recurse on what is left. Tiles come back in percentages of
 * the containing box, so the component is pure CSS and the same drawing works
 * at any size.
 */

export interface HeatItem {
  symbol: string;
  /** Market value. The area. Rows without one cannot be drawn. */
  value: number;
  /** Unrealised return as a fraction. Null where the broker reported no basis. */
  pnlPct: number | null;
}

export interface HeatTile extends HeatItem {
  /** Percent of the box, from its top-left corner. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Share of the whole book, 0–1. */
  weight: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The worst aspect ratio in a row laid across `side`, given its total area. */
function worst(row: number[], side: number, sum: number): number {
  if (!row.length || side <= 0 || sum <= 0) return Infinity;
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = sum * sum;
  const side2 = side * side;
  return Math.max((side2 * max) / s2, s2 / (side2 * min));
}

/** Lay a finished row along the short side of `box` and return what is left. */
function place(row: HeatItem[], areas: number[], box: Box, out: HeatTile[], total: number): Box {
  const sum = areas.reduce((a, b) => a + b, 0);
  if (sum <= 0) return box;
  const horizontal = box.w >= box.h;
  /* The row's thickness is its area over the side it spans. */
  const thickness = horizontal ? sum / box.h : sum / box.w;

  let along = horizontal ? box.y : box.x;
  row.forEach((item, i) => {
    const length = areas[i] / thickness;
    out.push({
      ...item,
      x: horizontal ? box.x : along,
      y: horizontal ? along : box.y,
      w: horizontal ? thickness : length,
      h: horizontal ? length : thickness,
      weight: total > 0 ? item.value / total : 0,
    });
    along += length;
  });

  return horizontal
    ? { x: box.x + thickness, y: box.y, w: box.w - thickness, h: box.h }
    : { x: box.x, y: box.y + thickness, w: box.w, h: box.h - thickness };
}

/**
 * Tiles for a box of 100 × 100 percentage units.
 *
 * Anything without a positive market value is dropped rather than drawn at
 * zero — a tile with no area is a name the reader cannot see and cannot click,
 * which is worse than a name that is honestly absent. Under two priced
 * holdings there is no map: one tile filling the box says nothing a sentence
 * would not say better.
 */
export function heatTiles(items: HeatItem[], min = 2): HeatTile[] {
  const priced = items
    .filter((i) => Number.isFinite(i.value) && i.value > 0)
    .sort((a, b) => b.value - a.value);
  if (priced.length < min) return [];

  const total = priced.reduce((sum, i) => sum + i.value, 0);
  /* Areas in percentage-squared units, so a full box is 100 × 100. */
  const scale = (10_000 as number) / total;

  const out: HeatTile[] = [];
  let box: Box = { x: 0, y: 0, w: 100, h: 100 };
  let row: HeatItem[] = [];
  let areas: number[] = [];

  for (const item of priced) {
    const area = item.value * scale;
    const side = Math.min(box.w, box.h);
    const next = [...areas, area];
    const sum = areas.reduce((a, b) => a + b, 0);

    if (
      row.length &&
      worst(next, side, sum + area) > worst(areas, side, sum)
    ) {
      box = place(row, areas, box, out, total);
      row = [item];
      areas = [area];
    } else {
      row.push(item);
      areas = next;
    }
  }
  if (row.length) place(row, areas, box, out, total);

  return out;
}

/**
 * How hard a tile is lit, 0–1, from its return.
 *
 * Saturation is capped at ±25%: past that every winner is the same green and
 * the map stops distinguishing a good year from a moonshot. A name with no
 * cost basis on file lights at zero and reads as neutral — the same absent
 * rather than defaulted rule the rest of the product runs on.
 */
export function heatStrength(pnlPct: number | null, cap = 25): number {
  if (pnlPct == null || !Number.isFinite(pnlPct)) return 0;
  return Math.min(1, Math.abs(pnlPct) / cap);
}
