import styles from "./loading.module.css";

/**
 * The dashboard's wait: the wheel, arriving.
 *
 * This screen leads on a polar chart of the whole book and waits on more than
 * any other route — the ledger, the derived document, and the day's first
 * written insight, which is a model call. The group's eight bars are the
 * right drawing for a screen that opens on columns and the wrong one for a
 * screen that opens on a ring.
 *
 * **It is not a spinner, and the first cut of it was.** Four arcs chasing
 * each other round a ring is a segmented spinner however it is described — a
 * machine saying it is busy, which is the one thing this file may not be. So
 * the wedges are fixed where the real ones would be and *arrive* instead:
 * each one lands in turn, at its own extent either side of the break-even
 * ring, and the figure holds still once they are all in. The wait looks like
 * the thing being waited for, which is the whole argument for drawing it.
 *
 * It carries no ticker and no figure. A wedge with a plausible number on it
 * would be a drawn number nobody can correct, on the screen whose entire
 * claim is that its figures came off a brokerage.
 */

const CX = 100;
const CY = 100;
/* The break-even ring, and the extents either side of it. */
const R0 = 58;

const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};

function sector(a0: number, a1: number, ri: number, ro: number) {
  const [x1, y1] = polar(ro, a0);
  const [x2, y2] = polar(ro, a1);
  const [x3, y3] = polar(ri, a1);
  const [x4, y4] = polar(ri, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x1},${y1}A${ro},${ro} 0 ${large} 1 ${x2},${y2}L${x3},${y3}A${ri},${ri} 0 ${large} 0 ${x4},${y4}Z`;
}

/*
 * Seven positions of a book that does not exist: a share of the circle and an
 * extent from break-even, one of them inward. The shape is illustrative and
 * carries no reading — it is the *form* of the chart, which is what makes the
 * arrival recognisable, and none of it survives into the screen that follows.
 */
const SHAPE = [
  { weight: 21, extent: 0 },
  { weight: 17, extent: 27 },
  { weight: 15, extent: 18 },
  { weight: 14, extent: -13 },
  { weight: 13, extent: 15 },
  { weight: 12, extent: 11 },
  { weight: 8, extent: 34 },
];

export default function Loading() {
  const total = SHAPE.reduce((sum, s) => sum + s.weight, 0);
  let cursor = 0;
  const wedges = SHAPE.map((s) => {
    const span = (s.weight / total) * 360;
    const a0 = cursor + 1.2;
    const a1 = cursor + span - 1.2;
    cursor += span;
    /* A flat position is a band on the datum, never a hairline. */
    const ri = s.extent >= 0 ? R0 : R0 + s.extent;
    const ro = s.extent > 0 ? R0 + s.extent : R0 + 2;
    return sector(a0, a1, ri, Math.max(ro, ri + 2));
  });

  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Weighing the book</span>

      <svg className={styles.dial} viewBox="0 0 200 200" aria-hidden="true">
        {/* The datum is drawn at once: it is not a measurement. */}
        <circle className={styles.datum} cx={CX} cy={CY} r={R0} />
        {wedges.map((d, i) => (
          <path key={i} className={styles.wedge} d={d} style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </svg>

      <div className={styles.words} aria-hidden="true">
        <p className={styles.title}>Weighing the book</p>
        <p className={styles.note}>every position, against break-even</p>
      </div>
    </div>
  );
}
