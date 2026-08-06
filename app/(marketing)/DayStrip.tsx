import styles from "./marketing.module.css";

const COUNT = 63;

// Deterministic sample data — same generator family as the brand kit.
const A = (i: number) => Math.sin(i * 1.7) + Math.cos(i * 0.53);
const H = (i: number) =>
  Math.abs(Math.sin(i * 2.13)) * 0.6 + Math.abs(Math.cos(i * 0.71)) * 0.4;

/** One bar per trading day in a quarter; the gold bars kept the rules. */
export function DayStrip() {
  return (
    <div className={styles.strip} aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => {
        const accent = A(i) > 1.15;
        const height = accent ? 62 + H(i) * 10 : 14 + H(i) * 30;
        return (
          <i
            key={i}
            className={accent ? `${styles.stripBar} ${styles.stripBarOn}` : styles.stripBar}
            style={{ height: `${height.toFixed(1)}px` }}
          />
        );
      })}
    </div>
  );
}
