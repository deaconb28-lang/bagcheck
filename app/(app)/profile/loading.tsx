import styles from "./loading.module.css";

/**
 * Settings' wait: the controls, before their state is known.
 *
 * This screen is a column of switches — the notification opt-ins, the linked
 * institution, export and erasure — and every one of them reads a stored
 * preference. So the drawing is four tracks whose knobs have not settled
 * yet, which is exactly what is true while the read is in flight.
 *
 * The knobs travel rather than resting at either end, because a switch drawn
 * *on* or *off* would be stating a preference nobody has read yet — the same
 * reason no other waiting state in this product carries a figure.
 */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.sr}>Opening your account</span>

      <div className={styles.stack} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.row}>
            <i className={styles.label} style={{ width: `${52 + i * 9}px` }} />
            <span className={styles.track}>
              <i className={styles.knob} style={{ animationDelay: `${i * 0.22}s` }} />
            </span>
          </div>
        ))}
      </div>

      <div className={styles.words} aria-hidden="true">
        <p className={styles.title}>Opening your account</p>
        <p className={styles.note}>preferences, plan and connection</p>
      </div>
    </div>
  );
}
