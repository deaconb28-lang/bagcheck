import { DAY_FILL, type DayState } from "./types";
import styles from "./idioms.module.css";

type DayGridProps = {
  days: DayState[];
  /** Labels under the two ends of the run. */
  from?: string;
  to?: string;
};

/** The same quarter as SegmentRing, unrolled where the surface is wider than tall. */
export function DayGrid({ days, from, to }: DayGridProps) {
  return (
    <div className={styles.stack}>
      <div className={styles.dayGrid} aria-hidden="true">
        {days.map((state, i) => (
          <i key={i} className={styles.dayCell} style={{ background: DAY_FILL[state] }} />
        ))}
      </div>
      {from || to ? (
        <div className={styles.ends}>
          <span>{from}</span>
          <span>{to}</span>
        </div>
      ) : null}
    </div>
  );
}
