import styles from "./loading.module.css";

/**
 * The Wrapped flow, while it is being read.
 *
 * `/wrapped` is the slowest screen in the product — it loads the ledger, the
 * scores and the whole deck — and it is also the one people arrive at from the
 * landing, which means the first thing a visitor ever sees of the app used to
 * be an unexplained pause on the page they came from.
 *
 * **The dial, not the pile.** This drew the deck's own frames so the arrival
 * moved nothing; what it actually showed a first-time visitor was four blank
 * rectangles for however long the read took. The dial says the work: two rings
 * turning against each other around the one figure this product is about, with
 * the sentence naming what is being read.
 *
 * The coin at the centre does not move, and that is a correction rather than a
 * simplification — it flipped on `rotateY` in the design this came from, which
 * draws the glyph mirrored for half of every cycle.
 *
 * Under reduced motion the rings stop where they are drawn and the glow sits
 * still — the static state is the finished drawing.
 */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Loading your year</span>

      <div className={styles.corner} aria-hidden="true" />

      <div className={styles.dial} aria-hidden="true">
        <span className={styles.glow} />

        <svg viewBox="0 0 260 260" className={`${styles.ring} ${styles.outer}`} fill="none">
          <circle
            cx="130"
            cy="130"
            r="124"
            stroke="var(--ink)"
            strokeWidth="1.5"
            strokeDasharray="190 600"
            strokeLinecap="round"
          />
        </svg>

        <svg viewBox="0 0 260 260" className={`${styles.ring} ${styles.inner}`} fill="none">
          <circle
            cx="130"
            cy="130"
            r="98"
            stroke="var(--ink)"
            strokeWidth="5"
            strokeDasharray="120 500"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>

        <span className={styles.coin}>$</span>
      </div>

      <div className={styles.words} aria-hidden="true">
        <p className={styles.title}>Reading your year</p>
        <p className={styles.note}>Every trade you closed, in order.</p>
      </div>
    </div>
  );
}
