import styles from "./loading.module.css";
import screen from "./screen.module.css";

/**
 * What the app shows while a screen is being read.
 *
 * Every route in this group is `force-dynamic` and every one of them waits on
 * Mongo — and on Home, on the day's first written insight, which is a model
 * call. Without this file Next has nothing to swap in, so the browser holds
 * the *previous* screen until the new one is ready: you tap Wrapped, nothing
 * happens for a second and a half, and the only reasonable conclusion is that
 * the tap missed.
 *
 * The shapes are the shapes of the screens — a header line, a hero plate, two
 * panels — so the layout does not jump when the real one lands. No spinner:
 * a spinner says "working" and a skeleton says "here, shortly", and the
 * second one is true.
 */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Loading your ledger</span>

      <header className={styles.head}>
        <span className={`${styles.bar} ${styles.title}`} />
        <span className={`${styles.bar} ${styles.meta}`} />
      </header>

      <div className={screen.body}>
        <div className={screen.grid}>
          <div className={`${styles.plate} ${styles.tall}`} />
          <div className={styles.plate} />
          <div className={styles.plate} />
        </div>
      </div>
    </div>
  );
}
