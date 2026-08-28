"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  BOX,
  declutter,
  describe,
  DUST_WEIGHT,
  foldDust,
  fmtPct,
  layout,
  gainRamp,
  radii,
  radiusFor,
  ringValues,
  solveScale,
  validate,
  type Tag,
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
 * ── What carries which meaning ────────────────────────────────────────────
 *
 * The specification this was built from gives every ticker a stable hue and
 * argues that frees colour from doing performance work. This build does the
 * opposite, because in this product the radius already carries performance:
 * a hue encoding identity on top of a radius encoding return would be two
 * channels for one reading, and it would reintroduce a per-slice palette
 * `tokens.css` deliberately withdrew. Identity is carried three ways without
 * it — the position in the sweep, the leader line, and the label.
 *
 * So the fill means money, and it says so twice: a gain is solid moss, a loss
 * is hatched loss behind a hairline. That is this project's standing rule and
 * it is also what the specification asks for under a different name — the
 * reading has to survive greyscale, and a pattern survives what a hue does
 * not.
 *
 * ── Everything is computed before paint ───────────────────────────────────
 *
 * Layout, scale and label collision are pure functions in `lib/wheel.ts`, so
 * the whole SVG is correct from the server render. The client adds two
 * things: the entrance, and focus. Neither is load-bearing — with JavaScript
 * off, or under reduced motion, the chart is finished and readable.
 */

export interface WheelProps {
  positions: WheelPosition[];
  /** Your weighted return, drawn as the dashed ring. */
  bookReturn: number;
  benchmark?: WheelBenchmark | null;
  /**
   * The account's value, already formatted. The centre's *figure* is not a
   * prop: it is `bookReturn` through the same formatter the legend uses, so
   * the two can never disagree — they did, and the middle of the chart read
   * +5.3% while the ring beside it read +5.29%. The name count is the
   * wheel's own, after dust is folded, for the same reason.
   */
  value: string;
  /** Rendered above the chart when the scale had to do something unusual. */
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
 * The jag says the bar was cut, and the label still states the true figure —
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

export function Wheel({ positions, bookReturn, benchmark, value, caption }: WheelProps) {
  const box = BOX;
  const cx = box.vb / 2;
  const cy = box.vb / 2;

  const model = useMemo(() => {
    const raw = validate(positions);
    /*
     * Dust is folded before anything is laid out. Four positions at a tenth
     * of a percent were four wedges at the minimum span with four leaders
     * leaving the same angle and four labels stacked into a pile — none of
     * them a reading, and together one.
     */
    const { positions: clean, folded } = foldDust(raw.positions);
    const { total, warnings, renderable } = { ...raw, renderable: clean.length >= 2 && clean.length <= 14 };
    const scale = solveScale(
      clean.map((p) => p.ret),
      benchmark?.ret ?? null,
      box,
    );
    const wedges = layout(clean, total, box);
    const rings = ringValues(scale, box);

    /*
     * The leader starts clear of the wedge's *outer* edge even for a losing
     * position — a loss grows inward, so a leader beginning at the wedge's
     * own inner edge would be drawn straight back through it.
     */
    const tags: Tag[] = wedges.map((w) => {
      const outer = Math.max(radiusFor(Math.max(w.ret, 0), scale, box) + 4, box.r0 + 4);
      const [x, y] = polar(box.rLabel, w.mid, cx, cy);
      return {
        ticker: w.ticker,
        side: Math.cos((w.mid * Math.PI) / 180) >= 0 ? "right" : "left",
        x,
        y,
        mid: w.mid,
        outer,
      };
    });

    /* Collision resolution earns its keep past eight names or under 14°. */
    const crowded = wedges.length > 8 || wedges.some((w) => w.a1 - w.a0 < 14);
    const placed = crowded ? declutter(tags, 34, box.vb) : tags;

    const step = gainRamp(clean.map((p) => p.ret));
    return { clean, wedges, rings, scale, tags: placed, warnings, renderable, step, folded };
  }, [positions, benchmark, box, cx, cy]);

  const { clean, wedges, rings, scale, tags, renderable, step, folded } = model;

  /* Refs so the entrance can rewrite `d` without React re-rendering per frame. */
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

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
   * effect drops to zero and walks back up, which is the same shape as
   * `<CountUp>`: a figure this product cannot afford to print wrongly is
   * never something an animation has to arrive at to become true.
   *
   * The radius is interpolated, never `transform: scale()`. Scaling the path
   * grows the angular gaps with it, so the wedges appear to widen — which
   * would be an animation of the weight channel, saying something false.
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
      const p = Math.min((ts - t0) / 1150, 1);
      draw(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [wedges, shape]);

  /* Focus lights the wedge, its leader and its label together. */
  const focus = (ticker: string | null) => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.classList.toggle(styles.focused, Boolean(ticker));
    svg.querySelectorAll<SVGElement>("[data-ticker]").forEach((n) => {
      n.classList.toggle(styles.on, n.getAttribute("data-ticker") === ticker);
    });
  };

  if (!renderable) return null;

  const refs = [
    { v: bookReturn, dash: "6 5", stroke: "var(--wheel-book)", label: `YOUR BOOK ${fmtPct(bookReturn)}` },
    ...(benchmark
      ? [
          {
            v: benchmark.ret,
            dash: "2 5",
            stroke: "var(--wheel-bench)",
            label: `${benchmark.label.toUpperCase()} ${fmtPct(benchmark.ret)}`,
          },
        ]
      : []),
  ];

  /*
   * The reference lines are drawn in the chart and named *underneath* it.
   *
   * Their labels used to sit at twelve o'clock beside the ring column, which
   * put six axis figures and two reference figures into one hundred-pixel
   * strip over the busiest part of the drawing. They are the two most
   * important lines here — the whole judgement is whether a wedge crosses one
   * — so crowding them was exactly backwards. In the legend they are read
   * once, in full, and the chart gets its top back.
   */
  const refRadii = refs.map((r) => radiusFor(r.v, scale, box));

  const titleId = "wheel-title";
  const descId = "wheel-desc";

  return (
    <figure className={`${styles.wrap} ${styles.stage}`}>
      <svg
        ref={svgRef}
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
            A loss is hatched as well as red. Direction stated in colour alone
            is a direction a large share of readers never see.
          */}
          <pattern id="wheel-loss" width="5" height="5" patternTransform="rotate(135)" patternUnits="userSpaceOnUse">
            <rect width="5" height="5" fill="var(--loss)" fillOpacity="0.14" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--loss)" strokeWidth="1.3" />
          </pattern>
        </defs>

        <circle cx={cx} cy={cy} r={box.r0} fill="url(#wheel-core)" />

        {/*
          The spine.
          
          Every reading here grows out of or bites into the break-even circle,
          and until this was drawn that circle only existed where a wedge
          happened to touch it — so a book of seven names read as seven
          fragments at seven radii rather than as one ring that varies. Whoop's
          ring has a full track behind its arc for exactly this reason: the
          shape has to be legible before the data is.
        */}
        <circle
          cx={cx}
          cy={cy}
          r={box.r0}
          fill="none"
          stroke="var(--wheel-datum)"
          strokeWidth={3}
        />

        {/*
          The figure spins into place as one body — rings and wedges together,
          because they are one drawing and a ring that held still while the
          wedges turned would read as two charts. The labels are outside this
          group and never rotate: text on its side is not a reading.
        */}
        <g className={styles.spin} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <g className={styles.rings}>
          {/*
            The axis, reduced to the ring that carries a reading.
            
            Six concentric gridlines behind a chart whose whole argument is
            two dashed circles made a dotted field, and the two rings that
            matter had to compete with it. What a reader needs from the axis
            here is a sense of scale, not a coordinate — the exact figure is
            printed beside every wedge already.
          */}
          {rings.map((v) => {
            const r = radiusFor(v, scale, box);
            const zero = Math.abs(v) < 1e-9;
            /* Keep the ends of the scale and drop the middle: two rings say
               how far out and how far in, and six say nothing more. */
            const edge = v === rings[0] || v === rings[rings.length - 1];
            if (!zero && !edge) return null;
            return (
              <g key={`ring-${v}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={zero ? "transparent" : "var(--wheel-grid)"}
                  strokeWidth={zero ? 0 : 1}
                />
                {!zero ? (
                  /*
                   * A ring label lands wherever the data put a wedge, so it
                   * needs a ground of its own — without one the column of
                   * values reads as debris scattered across the chart. The
                   * plate is the page's own colour, so it reads as the label
                   * sitting in front rather than as a box.
                   */
                  <g className={styles.axis}>
                    <rect
                      x={cx + 7}
                      y={cy - r + 3}
                      width={String(v).length * 5.6 + 10}
                      height={11}
                      rx={3}
                    />
                    <text className={styles.ringLabel} x={cx + 11} y={cy - r + 11}>
                      {v > 0 ? "+" : v < 0 ? "−" : ""}
                      {Math.abs(v)}%
                    </text>
                  </g>
                ) : null}
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
             * allow. So the fill sits back and a full-strength edge draws the
             * outline, which is also the mark the eye reads the radius off.
             */
            const fill = w.isCash
              ? "var(--wheel-cash)"
              : w.ret > 0
                ? /*
                   * The remainder takes the dimmest step whatever its blend
                   * comes to. It is four positions worth six-tenths of a
                   * percent, and at the top of the ramp it drew as a bright
                   * spike reaching further out than anything real on the
                   * chart — emphasis in inverse proportion to its size.
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

        </g>

        {/* ── Leaders ── */}
        <g className={styles.annotations}>
          {wedges.map((w, i) => {
            const tag = tags[i];
            const [x1, y1] = polar(tag.outer, w.mid, cx, cy);
            const [x2, y2] = polar(box.rLead, w.mid, cx, cy);
            const dir = tag.side === "right" ? 1 : -1;
            /* Once a label has moved off its own angle the straight leader
               no longer points at it, so it becomes an elbow. */
            const moved = Math.abs(tag.y - y2) > 1;
            const d = moved
              ? `M${x1},${y1}L${x2},${y2}L${tag.x - dir * 8},${tag.y - 4}`
              : `M${x1},${y1}L${x2},${y2}`;
            return (
              <path
                key={`lead-${w.ticker}`}
                className={styles.lead}
                data-ticker={w.ticker}
                d={d}
                fill="none"
                stroke="var(--wheel-lead)"
                strokeWidth={1}
              />
            );
          })}
        </g>

        {/* ── Labels ── */}
        <g className={styles.annotations}>
          {wedges.map((w, i) => {
            const tag = tags[i];
            const anchor = tag.side === "right" ? "start" : "end";
            return (
              <g
                key={`tag-${w.ticker}`}
                className={styles.tag}
                data-ticker={w.ticker}
                onMouseEnter={() => focus(w.ticker)}
                onMouseLeave={() => focus(null)}
              >
                <text className={styles.ticker} x={tag.x} y={tag.y} textAnchor={anchor}>
                  {w.ticker}
                </text>
                {/*
                  * The ticker, and nothing else.
                  *
                  * This carried the return and the weight under every name,
                  * which made it the *third* place those two figures appear
                  * on one screen — the list beside the chart states both, and
                  * the table under it states both again. Eight tickers each
                  * with a second line is sixteen label rows orbiting a
                  * drawing, and the drawing is what the reader came for.
                  *
                  * What the label has to do is answer "which wedge is that",
                  * and a ticker answers it. The magnitude is the radius; the
                  * exact figure is two inches away in type.
                  */}
              </g>
            );
          })}
        </g>

        {/* ── Centre ── */}
        <text
          className={styles.centrePrimary}
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          data-long={fmtPct(bookReturn).length > 7 || undefined}
        >
          {fmtPct(bookReturn)}
        </text>
        <text className={styles.centreSecondary} x={cx} y={cy + 34} textAnchor="middle">
          {value} · {clean.length} {clean.length === 1 ? "NAME" : "NAMES"}
        </text>
      </svg>

      <figcaption className={styles.legend}>
        <span className={styles.key}>
          <i className={styles.keyBook} aria-hidden="true" />
          Your book {fmtPct(bookReturn)}
        </span>
        {benchmark ? (
          <span className={styles.key}>
            <i className={styles.keyBench} aria-hidden="true" />
            {benchmark.label} {fmtPct(benchmark.ret)}
          </span>
        ) : null}
        {caption || folded ? (
          <span className={styles.keyNote}>
            {caption ?? `${folded} under ${DUST_WEIGHT}% drawn together as REST`}
          </span>
        ) : null}
      </figcaption>

      {/*
        The accessible chart.

        A generated `<desc>` says what the wheel argues; this says what it is
        made of. Nothing critical lives only in a tooltip, so a reader who
        never hovers — or never can — loses nothing.
      */}
      <table className={styles.sr}>
        <caption>Positions by weight, with return on cost</caption>
        <thead>
          <tr>
            <th scope="col">Position</th>
            <th scope="col">Weight</th>
            <th scope="col">Return on cost</th>
          </tr>
        </thead>
        <tbody>
          {clean.map((p) => (
            <tr key={p.ticker}>
              <th scope="row">{p.ticker}</th>
              <td>{p.weight.toFixed(1)}%</td>
              <td>{p.isCash ? "not deployed" : fmtPct(p.ret)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
