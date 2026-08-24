import styles from "./loading.module.css";

/**
 * The position table's wait: the table itself, filling.
 *
 * This route reads the ledger and then asks the market to backcheck any mark
 * the last sync left stale, so it is the slowest read in the group and the
 * one most likely to be looked at while it waits.
 *
 * Six rows, each a company mark, a name and a figure block, landing oldest
 * first. It is the shape of the thing arriving rather than a machine saying
 * it is busy — and it carries no numerals at all, because a plausible figure
 * in a waiting state is a figure nobody can correct.
 */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Pricing every position</span>

      <div className={styles.words} aria-hidden="true">
        <p className={styles.title}>Pricing every position</p>
        <p className={styles.note}>the broker&rsquo;s marks, then the quotes</p>
      </div>

      <div className={styles.rows} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.row} style={{ animationDelay: `${i * 0.11}s` }}>
            <i className={styles.mark} />
            <i className={styles.name} style={{ width: `${58 - i * 5}%` }} />
            <i className={styles.figure} />
          </div>
        ))}
      </div>
    </div>
  );
}
