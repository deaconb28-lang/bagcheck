import styles from "./loading.module.css";

/**
 * Setup's wait: the connection being made.
 *
 * `/start` is where a reader hands this product their brokerage, and the wait
 * here is a round trip to SnapTrade rather than a database read — so it is
 * both the longest wait in the product and the one where a reader is most
 * likely to wonder whether something has gone wrong.
 *
 * So the drawing says what is happening: two nodes and a path being drawn
 * between them, one pulse travelling along it. The far node stays hollow
 * until the near one has fired, because the whole claim of this screen is
 * that nothing is read until the connection exists.
 *
 * It sits in `(flex)`, which speaks the marketing field rather than the app's
 * — a signed-out visitor reaches this screen, and it must not look like a
 * product they have not opened yet.
 */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Reaching your brokerage</span>

      <svg className={styles.link} viewBox="0 0 260 80" aria-hidden="true">
        <line className={styles.path} x1="40" y1="40" x2="220" y2="40" pathLength={100} />
        <line className={styles.pulse} x1="40" y1="40" x2="220" y2="40" pathLength={100} />
        <circle className={styles.near} cx="40" cy="40" r="13" />
        <circle className={styles.far} cx="220" cy="40" r="13" />
      </svg>

      <div className={styles.words} aria-hidden="true">
        <p className={styles.title}>Reaching your brokerage</p>
        <p className={styles.note}>read-only, and it stays that way</p>
      </div>
    </div>
  );
}
