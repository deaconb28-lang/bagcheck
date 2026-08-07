import styles from "./portfolio.module.css";

type EquityCurveProps = {
  series: Array<{ date: string; value: number }>;
};

/** The only full equity curve in the app — Portfolio, per the brand rules. */
export function EquityCurve({ series }: EquityCurveProps) {
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 600;
  const height = 160;
  const step = series.length > 1 ? width / (series.length - 1) : width;

  const path = series
    .map((point, i) => {
      const x = i * step;
      const y = height - ((point.value - min) / span) * (height - 16) - 8;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const rising = values[values.length - 1] >= values[0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={styles.curve}
      role="img"
      aria-label={`Portfolio value across ${series.length} synced days`}
    >
      <path
        d={`${path} L${width} ${height} L0 ${height} Z`}
        fill={rising ? "var(--moss-tint)" : "var(--track)"}
        stroke="none"
      />
      <path
        d={path}
        fill="none"
        stroke={rising ? "var(--moss)" : "var(--loss)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
