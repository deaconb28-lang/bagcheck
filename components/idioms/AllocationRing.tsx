import styles from "./AllocationRing.module.css";

export interface Slice {
  key: string;
  label: string;
  /** Market value. Never a percentage — the ring works the share out. */
  value: number;
}

/**
 * Where the money is, as one ring.
 *
 * **A pie needs a colour per slice, which is exactly what this palette does
 * not have.** Five hues with one meaning each only survives if nothing is
 * allowed to spend a hue on being distinguishable, so the ring does not: it
 * takes the weight ramp in `tokens.css`, which is steps down `--signal`,
 * because a share of the book is exposure. Rank sets the step, so the ring's
 * order is the book's order and only the largest name is at full strength.
 * **This ring encodes size and never direction** — no slice ever goes moss
 * because the position is up, or the chart becomes a second P&L.
 *
 * Small names are the failure mode of every donut. A 0.4% slice is a hairline
 * that reads as a rendering artefact and lies about being visible, so anything
 * under the floor joins one closing step called "Rest" whatever its rank — and
 * a "Rest" holding exactly one name is promoted back out, because that is a
 * mislabel rather than a summary.
 *
 * Drawn as dashed strokes on one circle rather than as paths: no large-arc
 * branch, no trig, no float drift, and `pathLength="100"` makes a dash unit a
 * percentage point outright. Under three positions the ring returns null — a
 * two-slice donut is a sentence, and a block is absent rather than trivial.
 */

/** The floor. Under this, a name is part of "Rest" whatever its rank. */
const FLOOR = 0.03;
/** Named slices before the remainder closes the circle. */
const NAMED = 5;

const R = 40;
const STROKE = 16;

export function AllocationRing({
  slices,
  size = 216,
}: {
  slices: Slice[];
  size?: number;
}) {
  const priced = slices
    .filter((s) => Number.isFinite(s.value) && s.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = priced.reduce((sum, s) => sum + s.value, 0);
  if (priced.length < 3 || total <= 0) return null;

  const big = priced.filter((s) => s.value / total >= FLOOR);
  let head = big.slice(0, NAMED);
  let tail = priced.filter((s) => !head.includes(s));
  /* "Rest · 1 position" is a mislabel, so the last one comes back out. */
  if (tail.length === 1) {
    head = [...head, tail[0]];
    tail = [];
  }

  const rest = tail.reduce((sum, s) => sum + s.value, 0);
  const rows = [
    ...head.map((s, i) => ({
      key: s.key,
      label: s.label,
      sub: null as string | null,
      share: s.value / total,
      paint: `var(--w${Math.min(i + 1, NAMED)})`,
      rest: false,
    })),
    ...(rest > 0
      ? [
          {
            key: "__rest",
            label: "Rest",
            sub: `${tail.length} positions`,
            share: rest / total,
            paint: "var(--w-rest)",
            rest: true,
          },
        ]
      : []),
  ];

  /*
   * The separator is the ground, not a colour edge — which is also what keeps
   * two adjacent ramp steps from having to clear a contrast ratio against each
   * other. Roughly two rendered pixels, in the hundred units a full turn now
   * has, and never enough to eat a slice: a share smaller than the notch keeps
   * a hairline of itself instead of vanishing.
   */
  const gap = Math.min(1.4, Math.max(0.3, (2 / size) * 100 * 0.42));
  let start = 0;

  return (
    <div className={styles.wrap}>
      <div
        className={styles.ring}
        style={{ "--size": `${size}px` } as React.CSSProperties}
      >
        <svg viewBox="0 0 100 100" className={styles.svg} aria-hidden="true">
          {rows.map((row) => {
            const pct = row.share * 100;
            /*
             * A hairline of a slice rather than nothing — but never longer
             * than the slice itself, or the last segment on the circle runs
             * past a hundred and draws back over the first one.
             */
            const dash = Math.max(pct - gap, Math.min(0.5, pct));
            const offset = -(start + gap / 2);
            const delay = Math.min(start * 3, 280);
            start += pct;
            return (
              <circle
                key={row.key}
                className={styles.seg}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                pathLength={100}
                stroke={row.paint}
                strokeWidth={STROKE}
                /*
                 * Butt, never round: a round cap adds half a stroke width at
                 * each end, overlaps its neighbour and inflates every small
                 * slice — a drawn number that disagrees with the printed one.
                 */
                strokeLinecap="butt"
                strokeDasharray={`${dash.toFixed(3)} ${(100 - dash).toFixed(3)}`}
                strokeDashoffset={offset.toFixed(3)}
                style={{ animationDelay: `${delay.toFixed(0)}ms` }}
              />
            );
          })}
        </svg>
        <div className={styles.centre}>
          <span className={`num ${styles.count}`}>{priced.length}</span>
          <span className={styles.countLabel}>
            {priced.length === 1 ? "position" : "positions"}
          </span>
        </div>
      </div>

      {/*
        * The legend is the accessible chart, not a caption for one. Every
        * share is in type, permanently — no tooltip, no title attribute — and
        * the rows run in the ring's own clockwise order, so position
        * identifies a segment as much as its step does.
        */}
      <dl className={styles.legend}>
        {rows.map((row) => (
          <div key={row.key} className={styles.item} data-rest={row.rest || undefined}>
            <span className={styles.swatch} style={{ background: row.paint }} aria-hidden="true" />
            <dt className={styles.name}>
              {row.label}
              {row.sub ? <span className={styles.sub}>{row.sub}</span> : null}
            </dt>
            <dd className={`num ${styles.share}`}>
              {row.share * 100 < 1 ? "<1" : (row.share * 100).toFixed(0)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
