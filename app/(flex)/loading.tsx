import styles from "./loading.module.css";

/**
 * The Wrapped flow, while it is being read.
 *
 * `/wrapped` is the slowest screen in the product — it loads the ledger, the
 * scores and the whole deck — and it is also the one people arrive at from the
 * landing, which means the first thing a visitor ever sees of the app used to
 * be an unexplained pause on the page they came from.
 *
 * **It is a pile, because the deck is a pile.** This drew a rail of five card
 * frames side by side, which is the one shape `<YearDeck>` was rebuilt three
 * times to stop being: at the size a row of posters fits next to each other,
 * not one of them can be read. A skeleton promising a rail and handing over a
 * stack moves every card it just drew.
 *
 * The nav is a bar here rather than absent. The page renders `<AppNav>`
 * itself, so during the wait there is no nav at all — and without something
 * standing in its place the whole screen jumps down by its height the moment
 * the real one arrives.
 *
 * Nothing sweeps and nothing spins: one slow breath, and a field drifting a
 * great deal slower than that.
 */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Loading your year</span>

      <div className={styles.field} aria-hidden="true">
        <span className={styles.aurora} />
      </div>

      <div className={styles.nav} aria-hidden="true">
        <span className={`${styles.bar} ${styles.mark}`} />
        <span className={`${styles.bar} ${styles.navTabs}`} />
        <span className={`${styles.bar} ${styles.navEnd}`} />
      </div>

      <div className={styles.inner}>
        {/* The year and each quarter that has begun. */}
        <div className={styles.windows} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={styles.window} data-on={i === 0 || undefined} />
          ))}
        </div>

        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={`${styles.bar} ${styles.eyebrow}`} />
            <span className={`${styles.bar} ${styles.title}`} />
          </div>
          <span className={`${styles.bar} ${styles.door}`} />
        </div>

        {/*
          * Back to front, so the top card is last in the DOM and needs no
          * z-index to sit on top — the paint order is the stacking order,
          * which is one fewer thing to keep in step with the real deck.
          */}
        <div className={styles.pile} aria-hidden="true">
          <span className={`${styles.frame} ${styles.back3}`} />
          <span className={`${styles.frame} ${styles.back2}`} />
          <span className={`${styles.frame} ${styles.back1}`} />
          <span className={`${styles.frame} ${styles.top}`}>
            {/* The lockup's own footprint: an eyebrow, a title, a label, a hero. */}
            <span className={`${styles.bar} ${styles.cardEyebrow}`} />
            <span className={`${styles.bar} ${styles.cardTitle}`} />
            <span className={`${styles.bar} ${styles.cardLabel}`} />
            <span className={`${styles.bar} ${styles.cardHero}`} />
          </span>
        </div>
      </div>
    </div>
  );
}
