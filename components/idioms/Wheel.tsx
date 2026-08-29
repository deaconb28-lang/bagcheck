"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  arcRoom,
  BOX,
  describe,
  DUST_WEIGHT,
  foldDust,
  fmtPct,
  layout,
  gainRamp,
  radii,
  radiusFor,
  rankRoom,
  ringValues,
  solveScale,
  validate,
  type WheelBenchmark,
  type WheelPosition,
} from "@/lib/wheel";
import styles from "./Wheel.module.css";

/**
 * The Wheel.
 *
 * Angular width is weight, so the wedges sum to a whole and the chart is
 * self-evidently complete. Radial distance from the break-even ring is return
 * on cost — a gain grows outward, a loss bites inward. The two dashed rings
 * are what turn description into judgement: *does this wedge cross the line?*
 *
 * ── The drawing is a drawing, and the names are a list ────────────────────
 *
 * This used to answer "which wedge is that" with a ring of orbiting tickers
 * on leader lines, sitting outside the viewBox on `overflow: visible` with
 * the column padded to catch them. It cost a quarter of the radius, it needed
 * two-sided collision resolution to stop the labels stacking, and the halo of
 * type it produced was the first thing the eye landed on — around a chart
 * whose whole argument is in the shape of the ring.
 *
 * Nine ring charts were read before this was rebuilt and one of them draws
 * leader lines. Every other one — YNAB, Quicken, Binance, Coinbase, Twenty,
 * Glide, Adobe Express — names its segments in a list beside the ring. So
 * this does too. What carries identity on the drawing itself is **order**:
 * the wedges run clockwise from twelve in weight order, the key runs in the
 * same order, and each wedge wears its rank as a numeral — the device the
 * race and the heatmap already use, and one that survives a reader who
 * cannot separate two greens.
 *
 * A numeral is only drawn where the wedge has the arc for it. The floor is
 * silence, exactly as it is on the heatmap: a sliver keeps its colour, its
 * angle and its row in the key, and says nothing on the drawing rather than
 * saying it illegibly.
 *
 * ── Everything is computed before paint ───────────────────────────────────
 *
 * Layout and scale are pure functions in `lib/wheel.ts`, so the whole SVG is
 * correct from the server render. The client adds two things: the entrance,
 * and focus. Neither is load-bearing — with JavaScript off, or under reduced
 * motion, the chart is finished and readable.
 */

export interface WheelProps {
  positions: WheelPosition[];
  /** Your weighted return, drawn as the dashed ring. */
  bookReturn: number;
  benchmark?: WheelBenchmark | null;
  /** Rendered under the key when the scale had to do something unusual. */
  caption?: string | null;
}

const polar = (r: number, deg: number, cx: number, cy: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

/**
 * An annular sector.
 *
 * The two arcs take opposite sweep flags because the outer runs clockwise and
 * the inner runs back the other way. The joins stay sharp: rounding them
 * would pull the tips in and corrupt the angular width, which is the weight.
 */
function sector(a0: number, a1: number, ri: number, ro: number, cx: number, cy: number): string {
  const [x1, y1] = polar(ro, a0, cx, cy);
  const [x2, y2] = polar(ro, a1, cx, cy);
  const [x3, y3] = polar(ri, a1, cx, cy);
  const [x4, y4] = polar(ri, a0, cx, cy);
  const large = a1 - a0 > 180 ? 1 : 0;
  return (
    `M${x1},${y1}` +
    `A${ro},${ro} 0 ${large} 1 ${x2},${y2}` +
    `L${x3},${y3}` +
    `A${ri},${ri} 0 ${large} 0 ${x4},${y4}Z`
  );
}

/**
 * The truncation mark: a zigzag where the smooth outer arc would be.
 *
 * A wedge drawn to the edge with a clean arc claims a value it does not have.
 * The jag says the bar was cut, and the key still states the true figure —
 * a truncation nobody can see is a drawn number that lies.
 */
function jagged(a0: number, a1: number, r: number, cx: number, cy: number): string {
  const amp = 4;
  const step = Math.min(6, Math.max(1.5, (a1 - a0) / 4));
  const pts: string[] = [];
  let flip = false;
  for (let a = a0; a <= a1; a += step) {
    const [x, y] = polar(r + (flip ? -amp : amp), a, cx, cy);
    pts.push(`L${x},${y}`);
    flip = !flip;
  }
  const [ex, ey] = polar(r, a1, cx, cy);
  pts.push(`L${ex},${ey}`);
  return pts.join("");
}

export function Wheel({ positions, bookReturn, benchmark, caption }: WheelProps) {
  const box = BOX;
  const cx = box.vb / 2;
  const cy = box.vb / 2;

  const model = useMemo(() => {
    const raw = validate(positions);
    /*
     * Dust is folded before anything is laid out. Four positions at a tenth
     * of a percent were four wedges at the minimum span, none of them a
     * reading and together one.
     */
    const { positions: clean, folded } = foldDust(raw.positions);
    const { total } = raw;
    const renderable = clean.length >= 2 && clean.length <= 14;
    const scale = solveScale(
      clean.map((p) => p.ret),
      benchmark?.ret ?? null,
      box,
    );
    const wedges = layout(clean, total, box);
    const rings = ringValues(scale, box);
    const step = gainRamp(clean.map((p) => p.ret));
    return { clean, wedges, rings, scale, renderable, step, folded };
  }, [positions, benchmark, box]);

  const { clean, wedges, rings, scale, renderable, step, folded } = model;

  /* Refs so the entrance can rewrite `d` without React re-rendering per frame. */
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const rootRef = useRef<HTMLElement | null>(null);

  const shape = useMemo(
    () => (ret: number, w: (typeof wedges)[number]) => {
      const [ri, ro] = radii(ret, scale, box);
      const cut = ret > scale.ceil;
      if (cut) {
        /* Draw to the edge, then saw the outer arc off. */
        const [sx, sy] = polar(box.r0, w.a0, cx, cy);
        const [ix, iy] = polar(box.rMax, w.a0, cx, cy);
        /* The inner arc needs the large-arc flag too: a truncated position
           holding more than half the book would otherwise close the short
           way round and draw its own complement. */
        const large = w.a1 - w.a0 > 180 ? 1 : 0;
        return (
          `M${sx},${sy}L${ix},${iy}` +
          jagged(w.a0, w.a1, box.rMax, cx, cy) +
          `L${polar(box.r0, w.a1, cx, cy).join(",")}` +
          `A${box.r0},${box.r0} 0 ${large} 0 ${sx},${sy}Z`
        );
      }
      return sector(w.a0, w.a1, ri, ro, cx, cy);
    },
    [scale, box, cx, cy],
  );

  /*
   * The entrance.
   *
   * The server render is the *finished* chart, so a reader who never runs
   * this effect — JavaScript off, an error upstream — sees the real one. The
   * effect drops the radius to the datum and walks it back up, which is the
   * same shape as `<CountUp>`: a figure this product cannot afford to print
   * wrongly is never something an animation has to arrive at to become true.
   *
   * The radius is the only channel that moves, and that is deliberate on
   * both counts. Interpolating `transform: scale()` would grow the angular
   * gaps with it, so the wedges would appear to widen — an animation of the
   * weight channel, saying something false. And the whole figure used to
   * arrive *spinning*, a hundred and eighty-six degrees of it, which is the
   * same error in the same channel: on a chart where the angle a wedge sits
   * at is part of what identifies it, a wedge that arrives somewhere else is
   * a wedge in the wrong place for a second and a half.
   */
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const nodes = paths.current;
    let raf = 0;
    let t0: number | null = null;

    const draw = (t: number) => {
      wedges.forEach((w, i) => {
        const node = nodes[i];
        if (node) node.setAttribute("d", shape(w.ret * t, w));
      });
    };

    draw(0);
    const step = (ts: number) => {
      if (t0 == null) t0 = ts;
      const p = Math.min((ts - t0) / 1000, 1);
      draw(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [wedges, shape]);

  /*
   * Focus lights a wedge, its numeral and its row in the key together — the
   * three places one position appears. It is an enhancement and nothing
   * depends on it: every figure the hover reveals is already in the key.
   */
  const focus = (ticker: string | null) => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.toggle(styles.focused, Boolean(ticker));
    root.querySelectorAll<HTMLElement | SVGElement>("[data-ticker]").forEach((n) => {
      n.classList.toggle(styles.on, n.getAttribute("data-ticker") === ticker);
    });
  };

  if (!renderable) return null;

  const refs = [
    { v: bookReturn, dash: "6 5", stroke: "var(--wheel-book)", label: `Your book ${fmtPct(bookReturn)}` },
    ...(benchmark
      ? [
          {
            v: benchmark.ret,
            dash: "2 5",
            stroke: "var(--wheel-bench)",
            label: `${benchmark.label} ${fmtPct(benchmark.ret)}`,
          },
        ]
      : []),
  ];
  const refRadii = refs.map((r) => radiusFor(r.v, scale, box));

  const titleId = "wheel-title";
  const descId = "wheel-desc";

  return (
    <figure className={styles.wrap} ref={rootRef}>
      <div className={styles.stage}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${box.vb} ${box.vb}`}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
        >
          <title id={titleId}>Portfolio composition and return</title>
          <desc id={descId}>{describe(clean, benchmark ?? null)}</desc>

          <defs>
            {/* Stops the hole reading as a hole. */}
            <radialGradient id="wheel-core">
              <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
            </radialGradient>
            {/*
              A loss is hatched as well as red. Direction stated in colour
              alone is a direction a large share of readers never see.
            */}
            <pattern
              id="wheel-loss"
              width="5"
              height="5"
              patternTransform="rotate(135)"
              patternUnits="userSpaceOnUse"
            >
              <rect width="5" height="5" fill="var(--loss)" fillOpacity="0.14" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--loss)" strokeWidth="1.3" />
            </pattern>
          </defs>

          <circle cx={cx} cy={cy} r={box.r0} fill="url(#wheel-core)" />

          {/*
            ── The track ──

            The full annulus a wedge could occupy, at almost nothing. Every
            radial gauge worth reading draws one — Oura, Garmin, Whoop all put
            a complete ring behind the arc — and the reason is the same here
            as there: the shape has to be legible before the data is. Without
            it a book of seven names is seven fragments at seven radii with no
            drawn sense of how far out "far out" goes, so a chart of modest
            movement and a chart of enormous movement look identical.
          */}
          <circle
            cx={cx}
            cy={cy}
            r={(box.rMin + box.rMax) / 2}
            fill="none"
            stroke="var(--wheel-track)"
            strokeWidth={box.rMax - box.rMin}
          />

          {/*
            The spine: the break-even circle every reading here grows out of
            or bites into. Until this was drawn it only existed where a wedge
            happened to touch it.
          */}
          <circle cx={cx} cy={cy} r={box.r0} fill="none" stroke="var(--wheel-datum)" strokeWidth={3} />

          <g>
            {/*
              The axis, reduced to the ring that carries a reading. Six
              concentric gridlines behind a chart whose whole argument is two
              dashed circles made a dotted field. What a reader needs from the
              axis is a sense of scale, not a coordinate — the exact figure is
              printed in the key.
            */}
            {rings.map((v) => {
              const r = radiusFor(v, scale, box);
              const zero = Math.abs(v) < 1e-9;
              const edge = v === rings[0] || v === rings[rings.length - 1];
              if (zero || !edge) return null;
              return (
                <g key={`ring-${v}`}>
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--wheel-grid)" strokeWidth={1} />
                  {/*
                    A ring label lands wherever the data put a wedge, so it
                    needs a ground of its own — without one the value reads as
                    debris scattered across the chart. The plate is the page's
                    own colour, so it reads as the label sitting in front
                    rather than as a box.

                    The outward ring is labelled at the top of its circle and
                    the inward one at the bottom. Both used to sit at twelve
                    o'clock, and an inward ring is by definition close to the
                    centre — so a book with any loss in it stacked its own
                    scale on top of the centre figure and over whichever
                    losing wedge happened to be at the top of the sweep, which
                    is where the hatch is busiest. Opposite ends of the
                    vertical keeps them clear of each other and of the
                    lockup, and the inward one then lands in the hole, where
                    there is nothing to collide with.
                  */}
                  <g className={styles.axis}>
                    <rect
                      x={cx + 7}
                      y={v > 0 ? cy - r + 3 : cy + r - 8}
                      width={String(v).length * 5.6 + 10}
                      height={11}
                      rx={3}
                    />
                    <text
                      className={styles.ringLabel}
                      x={cx + 11}
                      y={v > 0 ? cy - r + 11 : cy + r}
                    >
                      {v > 0 ? "+" : v < 0 ? "−" : ""}
                      {Math.abs(v)}%
                    </text>
                  </g>
                </g>
              );
            })}

            {refs.map((ref, i) => (
              <circle
                key={ref.label}
                cx={cx}
                cy={cy}
                r={refRadii[i]}
                fill="none"
                stroke={ref.stroke}
                strokeWidth={1.1}
                strokeDasharray={ref.dash}
              />
            ))}
          </g>

          {/* ── Wedges ── */}
          <g>
            {wedges.map((w, i) => {
              const cut = w.ret > scale.ceil;
              /*
               * A gain is solid and a loss is hatched — direction stated in
               * form as well as in colour. But a wedge is a hundred pixels of
               * annulus, not a 3px meter, and full-strength moss across that
               * area is a hue filling a surface, which this palette does not
               * allow. So the fill sits back and a full-strength edge draws
               * the outline, which is also the mark the eye reads the radius
               * off.
               */
              const fill = w.isCash
                ? "var(--wheel-cash)"
                : w.ret > 0
                  ? /*
                     * The remainder takes the dimmest step whatever its blend
                     * comes to: it is four positions worth six-tenths of a
                     * percent, and at the top of the ramp it drew as a bright
                     * spike reaching further out than anything real.
                     */
                    `var(--wheel-gain-${w.isRest ? 1 : step(w.ret)})`
                  : w.ret < 0
                    ? "url(#wheel-loss)"
                    : "var(--wheel-cash)";
              const edge = w.isCash || w.ret === 0 ? "none" : w.ret > 0 ? "var(--moss)" : "var(--loss)";
              return (
                <path
                  key={w.ticker}
                  ref={(n) => {
                    paths.current[i] = n;
                  }}
                  className={styles.wedge}
                  data-ticker={w.ticker}
                  data-cut={cut || undefined}
                  d={shape(w.ret, w)}
                  fill={fill}
                  stroke={edge}
                  strokeWidth={edge === "none" ? 0 : 1}
                  onMouseEnter={() => focus(w.ticker)}
                  onMouseLeave={() => focus(null)}
                />
              );
            })}
          </g>

          {/*
            ── The rank ──

            Identity on the drawing, as a numeral on the datum. The datum is
            the one radius every wedge touches whichever way its position
            went, so the numerals form a ring rather than following the data
            around and colliding with it.

            Drawn only where the wedge has the arc for it. The floor is
            silence: a sliver keeps its colour, its angle and its row in the
            key, which is the same rule the heatmap runs on and for the same
            reason — an illegible label is worse than none, because a reader
            tries to read it.
          */}
          <g aria-hidden="true">
            {wedges.map((w, i) => {
              const label = String(i + 1);
              if (arcRoom(w, box.rRank) < rankRoom(label.length)) return null;
              const [x, y] = polar(box.rRank, w.mid, cx, cy);
              return (
                <text
                  key={`rank-${w.ticker}`}
                  className={styles.rank}
                  data-ticker={w.ticker}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {label}
                </text>
              );
            })}
          </g>

          {/* ── Centre ── */}
          {/*
            The rate, and the name of the rate. The account's *value* used to
            sit here too, under a name count — and the value is the largest
            figure on the screen already, six hundred pixels up, which made
            this the third statement of one number. What belongs in the middle
            of a chart is the chart's own summary.
          */}
          <text
            className={styles.centrePrimary}
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            data-long={fmtPct(bookReturn).length > 7 || undefined}
          >
            {fmtPct(bookReturn)}
          </text>
          <text className={styles.centreSecondary} x={cx} y={cy + 40} textAnchor="middle">
            RETURN ON COST
          </text>
        </svg>

        <p className={styles.refs}>
          {refs.map((ref, i) => (
            <span key={ref.label} className={styles.key}>
              <i className={i === 0 ? styles.keyBook : styles.keyBench} aria-hidden="true" />
              {ref.label}
            </span>
          ))}
        </p>
      </div>

      {/*
        ── The key ──

        Which wedge is which, and the accessible chart, in one object. It used
        to be two: a ring of orbiting tickers for people who could see the
        drawing, and a visually-hidden table saying the same thing for people
        who could not. A table that is worth writing for a screen reader is
        worth showing, and showing it is what let the leader lines go.

        The order is the sweep — clockwise from twelve, largest first — so the
        numerals join the two halves. The row's own underline is weight, which
        is the angular channel restated as a length: an angle is the one
        quantity this chart encodes that a reader cannot compare accurately by
        eye.
      */}
      <div className={styles.keyPane}>
        <table className={styles.book}>
          <caption className={styles.caption}>In the order the wheel draws them</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.hRank}>
                #
              </th>
              <th scope="col">Position</th>
              <th scope="col" className={styles.hNum}>
                Weight
              </th>
              <th scope="col" className={styles.hNum}>
                Return
              </th>
            </tr>
          </thead>
          <tbody>
            {wedges.map((w, i) => (
              <tr
                key={w.ticker}
                className={styles.row}
                data-ticker={w.ticker}
                style={{ animationDelay: `${Math.min(i * 34, 280)}ms` }}
                onMouseEnter={() => focus(w.ticker)}
                onMouseLeave={() => focus(null)}
              >
                <td className={styles.rankCell}>
                  <span className={styles.chip}>{i + 1}</span>
                </td>
                <th scope="row" className={styles.symbol}>
                  {w.ticker}
                </th>
                <td className={`num ${styles.weight}`}>
                  {w.weight.toFixed(1)}%
                  {/*
                    The weight bar sits under the figure it restates. An angle
                    is the one quantity this chart encodes that a reader cannot
                    compare accurately by eye — two wedges twelve degrees apart
                    look the same — so the key states weight twice: once in
                    type, and once as a length, which is the channel the eye is
                    actually good at.
                  */}
                  <i className={styles.track} aria-hidden="true">
                    <i className={styles.bar} style={{ transform: `scaleX(${w.weight / 100})` }} />
                  </i>
                </td>
                <td
                  className={`num ${styles.ret}`}
                  data-dir={w.isCash ? "flat" : w.ret > 0 ? "up" : w.ret < 0 ? "down" : "flat"}
                >
                  {w.isCash ? "not deployed" : fmtPct(w.ret)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {caption || folded ? (
          <p className={styles.note}>
            {caption ?? `${folded} names under ${DUST_WEIGHT}% of the book drawn together as REST`}
          </p>
        ) : null}
      </div>
    </figure>
  );
}
