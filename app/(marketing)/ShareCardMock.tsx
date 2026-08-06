import styles from "./marketing.module.css";

// Deterministic strip, same generator family as the brand kit's share cards.
const S = (i: number) => Math.sin(i * 1.3) + Math.cos(i * 0.61);

/**
 * A rendered share card. Uses only --share-* tokens so it stays
 * aubergine-black in both modes, as the brand requires.
 */
export function ShareCardMock() {
  return (
    <div className={styles.shareCard}>
      <div className={styles.shareK}>Bagcheck · 2026</div>
      <div className={styles.shareV}>412</div>
      <div className={styles.shareT}>days holding — your longest yet</div>
      <div className={styles.shareStrip} aria-hidden="true">
        {Array.from({ length: 48 }, (_, i) => {
          const v = S(i);
          const cls =
            v > 1.3
              ? `${styles.shareCell} ${styles.shareCellSig}`
              : v > -0.7
                ? `${styles.shareCell} ${styles.shareCellOn}`
                : styles.shareCell;
          return <i key={i} className={cls} />;
        })}
      </div>
    </div>
  );
}
