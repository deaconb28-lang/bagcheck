import styles from "./idioms.module.css";

type DistributionProps = {
  /** Where the person sits, 0–100. Drawn as the signal mark on the tail. */
  percentile: number;
  label?: string;
};

/**
 * Everyone who lived through the same window, with the person marked.
 * Signal blue, because comparison against other people is always blue.
 */
export function Distribution({ percentile, label }: DistributionProps) {
  const w = 200;
  const h = 104;
  const clamped = Math.max(0, Math.min(100, percentile));

  let path = `M4 ${h - 8} `;
  for (let x = 4; x <= w - 4; x += 4) {
    const y = h - 8 - 72 * Math.exp(-Math.pow((x - 78) / 34, 2));
    path += `L${x} ${y.toFixed(1)} `;
  }
  path += `L${w - 4} ${h - 8} Z`;

  const markX = 4 + ((w - 8) * clamped) / 100;
  // The mark stands to a fixed height rather than tracking the curve — on the
  // tail the curve is near zero, and a marker you cannot see is not a marker.
  const markY = h * 0.28;

  return (
    <div className={styles.stack}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={styles.svg}
        role="img"
        aria-label={`You are at the ${clamped}th percentile`}
      >
        <path d={path} fill="var(--moss-tint)" stroke="var(--moss)" strokeWidth="1.6" />
        <line
          x1={markX.toFixed(1)}
          y1={markY.toFixed(1)}
          x2={markX.toFixed(1)}
          y2={h - 8}
          stroke="var(--signal)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx={markX.toFixed(1)} cy={markY.toFixed(1)} r="3.4" fill="var(--signal)" />
      </svg>
      {label ? <p className={styles.caption}>{label}</p> : null}
    </div>
  );
}
