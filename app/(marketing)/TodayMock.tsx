import styles from "./marketing.module.css";

const ROWS = [
  { name: "Held through the drawdown", fill: 84, value: "+9", tone: "gold" },
  { name: "Contributions on schedule", fill: 62, value: "+5", tone: "gold" },
  { name: "Exposure above your baseline", fill: 44, value: "−2", tone: "violet" },
  { name: "Sold two winners early", fill: 26, value: "−4", tone: "clay" },
] as const;

/**
 * The Today screen as it actually renders — the app defaults to dark, so
 * the mock stays aubergine on the light page via --share-* tokens.
 */
export function TodayMock() {
  return (
    <div className={styles.todayCard}>
      <div className={styles.todayEyebrow}>Wed · Aug 6 · pre-market</div>
      <p className={styles.todaySentence}>
        You held through three straight down weeks. That’s new for you.
      </p>
      <div className={styles.todayScoreline}>
        <span className={`num ${styles.todayScore}`}>82</span>
        <span className={styles.todayEyebrow}>Discipline · +3 this week</span>
      </div>
      <div className={styles.todayRows}>
        {ROWS.map((row) => (
          <div key={row.name} className={styles.todayRow}>
            <span className={styles.todayRowName}>{row.name}</span>
            <span className={styles.todayTrack}>
              <span
                className={styles.todayFill}
                data-tone={row.tone}
                style={{ width: `${row.fill}%` }}
              />
            </span>
            <span className={styles.todayVal}>{row.value}</span>
          </div>
        ))}
      </div>
      <div className={styles.todayChips}>
        <span className={styles.todayChip}>● 41-day streak</span>
        <span className={`${styles.todayChip} ${styles.todayChipV}`}>
          ● Top 6% patience
        </span>
      </div>
    </div>
  );
}
