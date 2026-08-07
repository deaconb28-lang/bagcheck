import styles from "./idioms.module.css";

export type ScatterPoint = {
  /** 0–1 across the horizontal axis. */
  x: number;
  /** 0–1 up the vertical axis. */
  y: number;
  /** Draws violet — use for the cluster that carries the insight. */
  accent?: boolean;
};

type DotScatterProps = {
  points: ScatterPoint[];
  /** 0–1. Draws a dashed rule where the cluster begins. */
  divider?: number;
  label?: string;
};

/** For when a cluster gap is the insight — entries by hour, say. */
export function DotScatter({ points, divider, label }: DotScatterProps) {
  const w = 200;
  const h = 104;

  return (
    <div className={styles.stack}>
      <svg viewBox={`0 0 ${w} ${h}`} className={styles.svg} aria-hidden="true">
        {divider != null ? (
          <line
            x1={(8 + (w - 16) * divider).toFixed(1)}
            y1="6"
            x2={(8 + (w - 16) * divider).toFixed(1)}
            y2={h - 6}
            stroke="var(--line2)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ) : null}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={(8 + (w - 16) * Math.max(0, Math.min(1, p.x))).toFixed(1)}
            cy={(h - 10 - (h - 20) * Math.max(0, Math.min(1, p.y))).toFixed(1)}
            r="2.6"
            fill={p.accent ? "var(--signal)" : "var(--moss-dim)"}
          />
        ))}
      </svg>
      {label ? <p className={styles.caption}>{label}</p> : null}
    </div>
  );
}
