import styles from "./marketing.module.css";

const COUNT = 63;

// Deterministic sample data — same generator family as the brand kit.
const A = (i: number) => Math.sin(i * 1.7) + Math.cos(i * 0.53);
const H = (i: number) =>
  Math.abs(Math.sin(i * 2.13)) * 0.6 + Math.abs(Math.cos(i * 0.71)) * 0.4;

/**
 * One bar per trading day in a quarter. Gold days stayed inside the rules;
 * violet days ran above the exposure baseline.
 */
export function DayStrip() {
  return (
    <div className={styles.strip} aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => {
        const v = A(i);
        const gold = v > 1.15;
        const violet = v < -1.05;
        const height = gold ? 62 + H(i) * 10 : violet ? 46 + H(i) * 12 : 14 + H(i) * 30;
        const cls = gold
          ? `${styles.stripBar} ${styles.stripBarOn}`
          : violet
            ? `${styles.stripBar} ${styles.stripBarSig}`
            : styles.stripBar;
        return <i key={i} className={cls} style={{ height: `${height.toFixed(1)}px` }} />;
      })}
    </div>
  );
}
