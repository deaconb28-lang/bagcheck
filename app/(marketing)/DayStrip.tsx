import styles from "./marketing.module.css";

const COUNT = 63;

// Deterministic sample data — same generator family as the brand kit.
const A = (i: number) => Math.sin(i * 1.7) + Math.cos(i * 0.53);
const H = (i: number) =>
  Math.abs(Math.sin(i * 2.13)) * 0.6 + Math.abs(Math.cos(i * 0.71)) * 0.4;

/**
 * One bar per trading day in a quarter, spanning the hero. Moss days stayed
 * inside the rules; signal days ran above the exposure baseline.
 *
 * Each bar carries its index as --i. Scroll-driven CSS uses it to stagger the
 * wave so a pulse travels left to right as the page moves; where scroll
 * timelines are unsupported the bars simply stand at their real heights.
 */
export function DayStrip() {
  return (
    <div className={styles.strip} aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => {
        const v = A(i);
        const moss = v > 1.15;
        const signal = v < -1.05;
        const height = moss ? 76 + H(i) * 16 : signal ? 54 + H(i) * 18 : 16 + H(i) * 34;
        const cls = moss
          ? `${styles.stripBar} ${styles.stripBarOn}`
          : signal
            ? `${styles.stripBar} ${styles.stripBarSig}`
            : styles.stripBar;
        return (
          <i
            key={i}
            className={cls}
            style={{ height: `${height.toFixed(1)}%`, "--i": i } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
