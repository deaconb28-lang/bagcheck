import styles from "./EquityCurve.module.css";

export type CurvePoint = { date: string; value: number };

const W = 720;
const H = 220;
const PAD = 8;

/** Catmull-Rom to cubic — a smoothed path without a charting dependency. */
function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return "";
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * The full equity curve. DNA only — four identical sparklines across four
 * screens is what this rule exists to prevent, so no other screen renders one.
 *
 * `tone` is which family the curve is drawn in, and it is not decoration.
 * `moss` is money up, which is what an *equity* curve rising means. The
 * cumulative-invested curve a day-one account gets instead is not money up —
 * it rises because the reader paid money in — so drawing it green tells them
 * they are in profit on a screen whose whole claim is that its figures are
 * checkable. That one is `signal`, which is what this palette gives exposure.
 */
export function EquityCurve({
  series,
  tone = "moss",
}: {
  series: CurvePoint[];
  tone?: "moss" | "signal";
}) {
  if (series.length < 2) return null;

  const values = series.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;

  const points: Array<[number, number]> = series.map((p, i) => [
    PAD + (i / (series.length - 1)) * (W - PAD * 2),
    PAD + (1 - (p.value - lo) / span) * (H - PAD * 2),
  ]);

  const line = smoothPath(points);
  const fill = `${line} L${points[points.length - 1][0].toFixed(1)} ${H} L${points[0][0].toFixed(1)} ${H} Z`;
  const end = points[points.length - 1];
  const gridlines = [0.25, 0.5, 0.75].map((f) => PAD + f * (H - PAD * 2));

  const stroke = tone === "signal" ? "var(--signal)" : "var(--moss)";
  const tint = tone === "signal" ? "var(--signal-tint)" : "var(--moss-tint)";

  return (
    <figure className={styles.figure}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="none" aria-hidden="true">
        {gridlines.map((y) => (
          <line key={y} x1={0} x2={W} y1={y} y2={y} stroke="var(--line-light)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path className={styles.area} d={fill} fill={tint} />
        {/*
          * `pathLength` normalises the run to 1, so one dash unit is the whole
          * curve and the offset is a share of it. The finished state is a zero
          * offset — what renders if the animation never starts.
          */}
        <path
          className={styles.line}
          d={line}
          fill="none"
          pathLength={1}
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={end[0]} cy={end[1]} r="4" fill={stroke} />
      </svg>
      <figcaption className={styles.axis}>
        <span>{series[0].date}</span>
        <span>{series[series.length - 1].date}</span>
      </figcaption>
    </figure>
  );
}
