import styles from "./reports.module.css";

type ScoreHistoryProps = {
  /** Oldest to newest. */
  series: Array<{ date: string; score: number }>;
};

/**
 * A day cell per scored day — the wide-surface idiom, not a sparkline.
 * Opacity carries the score so the shape of a good run is readable.
 */
export function ScoreHistory({ series }: ScoreHistoryProps) {
  if (series.length === 1) {
    const only = series[0];
    return (
      <p className={styles.body}>
        One scored day so far: {only.score} on {only.date}. The history builds
        from here.
      </p>
    );
  }

  return (
    <div className={styles.history}>
      <div className={styles.cells}>
        {series.map((point) => (
          <span
            key={point.date}
            className={styles.cell}
            style={{ opacity: 0.25 + (point.score / 100) * 0.75 }}
            title={`${point.date} · ${point.score}`}
          />
        ))}
      </div>
      <div className={styles.historyMeta}>
        <span>{series[0].date}</span>
        <span>{series[series.length - 1].date}</span>
      </div>
    </div>
  );
}
