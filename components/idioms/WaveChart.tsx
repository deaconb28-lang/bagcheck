import styles from "./WaveChart.module.css";

export type WaveDay = {
  date: string;
  /** Signed P&L for the session. */
  amount: number;
};

/**
 * Daily P&L, mirrored about a centre hairline.
 *
 * Above the line is moss, below is clay, and clay appears here for the only
 * reason it is allowed to: the number is negative. The bars draw left to
 * right on an 8ms-per-bar stagger, which reads as a chart being written
 * rather than a chart appearing.
 */
export function WaveChart({ days, height = 172 }: { days: WaveDay[]; height?: number }) {
  const peak = days.reduce((m, d) => Math.max(m, Math.abs(d.amount)), 0) || 1;

  return (
    <div className={styles.wave} style={{ "--h": `${height}px` } as React.CSSProperties}>
      <div className={styles.axis} aria-hidden="true" />
      {days.map((day, i) => {
        const mag = `${Math.max(2, (Math.abs(day.amount) / peak) * 100)}%`;
        const up = day.amount >= 0;
        return (
          <div key={day.date} className={styles.col} title={`${day.date} · ${up ? "+" : "−"}${Math.abs(Math.round(day.amount)).toLocaleString("en-US")}`}>
            <div className={styles.upHalf}>
              {up ? (
                <i className={styles.bar} data-dir="up" style={{ height: mag, animationDelay: `${i * 8}ms` }} />
              ) : null}
            </div>
            <div className={styles.downHalf}>
              {!up ? (
                <i className={styles.bar} data-dir="down" style={{ height: mag, animationDelay: `${i * 8}ms` }} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
