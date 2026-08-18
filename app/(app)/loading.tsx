import styles from "./loading.module.css";
import screen from "./screen.module.css";

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
 * **The shapes are the shapes of the screen, and that is the whole job.** This
 * drew the pre-redesign dashboard — a door, a pair of plates, two more — while
 * the screen that replaced it opens on a ring, a numeral and four arcs. A
 * skeleton that promises one layout and hands over another is worse than none:
 * the arrival moves every plate it just promised, which is the exact failure
 * the older note in this file was written to prevent.
 *
 * No spinner. A spinner says "working" and a skeleton says "here, shortly",
 * and the second one is true — so the ring is drawn at rest, with its arc
 * already placed, rather than chasing its own tail. The only motion is one
 * slow breath across the whole set and the field drifting behind it.
 */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Loading your ledger</span>

      {/*
        * The field. Dark-only and purely decorative, so it is hidden from the
        * accessibility tree and carries no content — it exists to stop the
        * wait being a grey rectangle, and it is the same drifting gesture the
        * app shell already runs behind every screen.
        */}
      <div className={styles.field} aria-hidden="true">
        <span className={styles.aurora} />
      </div>

      <header className={styles.head}>
        <span className={`${styles.bar} ${styles.title}`} />
        <span className={`${styles.bar} ${styles.meta}`} />
      </header>

      <div className={screen.body}>
        <div className={`${screen.grid} ${styles.wide}`}>
          {/* ── The hero: ring, character, numeral, name, chips ── */}
          <section className={styles.hero}>
            <div className={styles.ring} aria-hidden="true">
              <svg viewBox="0 0 228 228" className={styles.ringSvg}>
                <circle cx="114" cy="114" r="107" className={styles.ringTrack} />
                {/*
                  * `pathLength` normalises the circumference to 100, so the
                  * dash pair is read as percentage points and the arc's length
                  * does not have to be recomputed from a radius.
                  */}
                <circle
                  cx="114"
                  cy="114"
                  r="107"
                  pathLength="100"
                  className={styles.ringArc}
                  strokeDasharray="68 32"
                  transform="rotate(-90 114 114)"
                />
              </svg>
              <span className={styles.character} />
            </div>

            <div className={styles.words}>
              <span className={`${styles.bar} ${styles.eyebrow}`} />
              <span className={`${styles.bar} ${styles.figure}`} />
              <span className={`${styles.bar} ${styles.name}`} />
              <span className={`${styles.bar} ${styles.line}`} />
              <div className={styles.chips}>
                <span className={`${styles.bar} ${styles.chip}`} />
                <span className={`${styles.bar} ${styles.chip} ${styles.chipWide}`} />
                <span className={`${styles.bar} ${styles.chip}`} />
              </div>
            </div>
          </section>

          {/* ── The four components, as the dials they will become ── */}
          <div className={styles.arcs} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.arc}>
                <svg viewBox="0 0 66 66" className={styles.arcSvg}>
                  <circle cx="33" cy="33" r="30" className={styles.arcTrack} />
                </svg>
                <span className={`${styles.bar} ${styles.arcBar}`} />
              </div>
            ))}
          </div>

          <span className={`${styles.bar} ${styles.total}`} />

          {/*
            * Four ruled columns, not four boxes — the stat stopped being a
            * plate in the redesign, and a skeleton that still draws one would
            * promise a border that never arrives.
            */}
          <div className={styles.stats}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.stat}>
                <span className={`${styles.bar} ${styles.statLabel}`} />
                <span className={`${styles.bar} ${styles.statValue}`} />
                <span className={`${styles.bar} ${styles.statTail}`} />
              </div>
            ))}
          </div>

          <div className={`${styles.plate} ${styles.tall}`} />
          <div className={styles.pair}>
            <div className={styles.plate} />
            <div className={styles.plate} />
          </div>
        </div>
      </div>
    </div>
  );
}
