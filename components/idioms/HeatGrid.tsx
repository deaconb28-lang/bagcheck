import styles from "./HeatGrid.module.css";

export type HeatDay = {
  date: string;
  /** 0–4 on the ramp. 0 is an empty cell, not a missing one. */
  level: 0 | 1 | 2 | 3 | 4;
  note?: string;
};

/**
 * Weeks across, weekdays down. One measurement, five steps — a heat grid is
 * a single statement about consistency, so it gets one ramp and no second
 * colour.
 */
export function HeatGrid({ days, legend = true }: { days: HeatDay[]; legend?: boolean }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {days.map((day) => (
          <i
            key={day.date}
            className={styles.cell}
            data-level={day.level}
            title={day.note ?? day.date}
          />
        ))}
      </div>
      {legend ? (
        <div className={styles.legend}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className={styles.key} data-level={l} />
          ))}
          <span>More</span>
        </div>
      ) : null}
    </div>
  );
}
