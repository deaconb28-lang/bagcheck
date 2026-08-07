import styles from "./idioms.module.css";

type ContributionGridProps = {
  /** One entry per day, oldest first. 0 = nothing, 1 = a full contribution. */
  days: number[];
  label?: string;
};

/** Deposits laid out by week, with the cell in progress lit. */
export function ContributionGrid({ days, label }: ContributionGridProps) {
  const last = days.length - 1;
  return (
    <div className={styles.stack}>
      <div className={styles.contribGrid} aria-hidden="true">
        {days.map((value, i) => {
          const background =
            i === last
              ? "var(--moss)"
              : value <= 0
                ? "var(--track)"
                : value >= 1
                  ? "var(--moss)"
                  : "var(--moss-dim)";
          return <i key={i} className={styles.contribCell} style={{ background }} />;
        })}
      </div>
      {label ? <p className={styles.caption}>{label}</p> : null}
    </div>
  );
}
