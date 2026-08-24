import styles from "./loading.module.css";

/**
 * The collection's wait: the frames, before any of them is proved.
 *
 * This screen is a roster of what the ledger has earned, so the drawing is
 * that roster with nothing in it yet — twelve hairline frames, each lighting
 * in turn as though it were being checked. What it must never do is show a
 * frame as *earned*: a filled frame in a waiting state is a claim about the
 * reader that the ledger has not made, which is the same rule every locked
 * tile in this product is built on.
 */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Checking what the ledger has proved</span>

      <div className={styles.grid} aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} className={styles.frame} style={{ animationDelay: `${i * 0.13}s` }} />
        ))}
      </div>

      <div className={styles.words} aria-hidden="true">
        <p className={styles.title}>Checking what the ledger has proved</p>
        <p className={styles.note}>twelve frames, one pass</p>
      </div>
    </div>
  );
}
