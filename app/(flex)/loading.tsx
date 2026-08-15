import styles from "./loading.module.css";

/**
 * The Wrapped flow, while it is being read.
 *
 * `/wrapped` is the slowest screen in the product — it loads the ledger, the
 * scores and the whole deck — and it is also the one people arrive at from
 * the landing, which means the first thing a visitor ever sees of the app
 * used to be an unexplained pause on the page they came from. Card-shaped
 * frames in the deck's own rhythm, on the deck's own field.
 */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Loading your year</span>
      <div className={styles.head}>
        <span className={`${styles.bar} ${styles.eyebrow}`} />
        <span className={`${styles.bar} ${styles.title}`} />
      </div>
      <div className={styles.rail}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={styles.frame} />
        ))}
      </div>
    </div>
  );
}
