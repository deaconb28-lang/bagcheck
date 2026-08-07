import styles from "./idioms.module.css";

type DecayLineProps = {
  /** Values 0–1, oldest first. */
  series: number[];
  label?: string;
};

/** How long something survives contact with time — conviction, or a streak. */
export function DecayLine({ series, label }: DecayLineProps) {
  const w = 200;
  const h = 104;
  const points = series.length > 1 ? series : [1, 1];
  const step = (w - 12) / (points.length - 1);

  const path = points
    .map((v, i) => {
      const x = 6 + i * step;
      const y = h - 12 - (h - 28) * Math.max(0, Math.min(1, v));
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const last = points[points.length - 1];
  const endX = 6 + (points.length - 1) * step;
  const endY = h - 12 - (h - 28) * Math.max(0, Math.min(1, last));
  const falling = last < points[0];

  return (
    <div className={styles.stack}>
      <svg viewBox={`0 0 ${w} ${h}`} className={styles.svg} aria-hidden="true">
        <path
          d={path}
          fill="none"
          stroke="var(--moss)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="6" cy={(h - 12 - (h - 28) * points[0]).toFixed(1)} r="3.2" fill="var(--moss)" />
        <circle
          cx={endX.toFixed(1)}
          cy={endY.toFixed(1)}
          r="3.2"
          fill={falling ? "var(--loss)" : "var(--moss)"}
        />
      </svg>
      {label ? <p className={styles.caption}>{label}</p> : null}
    </div>
  );
}
