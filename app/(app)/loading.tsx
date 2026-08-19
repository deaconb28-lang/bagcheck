import styles from "./loading.module.css";

/**
 * What the app shows while a screen is being read.
 *
 * Every route in this group is `force-dynamic` and every one of them waits on
 * Mongo — and the dashboard, on the day's first written insight, which is a
 * model call. Without this file Next has nothing to swap in, so the browser
 * holds the *previous* screen until the new one is ready: you tap through,
 * nothing happens for a second and a half, and the only reasonable conclusion
 * is that the tap missed.
 *
 * **It was a skeleton and it is now a readout.** The skeleton drew the
 * dashboard's own plates so nothing moved on arrival, which is the stronger
 * argument on a screen that loads in a blink — and the weaker one on this
 * screen, which waits on a database and a model call and spent that whole wait
 * showing grey rectangles. What replaces it says what is being done: eight
 * bars in the ramp the dashboard's own charts are drawn in, breathing left to
 * right, under the sentence naming the work. The arrival does move it, and
 * that is the trade being made deliberately.
 *
 * No spinner. A spinner is a machine saying it is busy; these are the shapes
 * this product deals in, which is a different sentence. Under reduced motion
 * the bars stand at full height and nothing moves — the static state is the
 * finished drawing, as it must be.
 */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Loading your ledger</span>

      <div className={styles.bars} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <i key={i} className={styles.bar} style={{ animationDelay: `${i * 0.14}s` }} />
        ))}
      </div>

      <div className={styles.words} aria-hidden="true">
        <p className={styles.title}>Calculating P&amp;L</p>
        <p className={styles.note}>reading your positions</p>
      </div>
    </div>
  );
}
