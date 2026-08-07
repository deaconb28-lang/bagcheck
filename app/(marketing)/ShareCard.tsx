import styles from "./marketing.module.css";

type ShareCardProps = {
  label: string;
  value: string;
  tail: string;
  /** Value colour — moss for behaviour, signal for archetype/comparison. */
  accent?: "moss" | "signal";
  /** Render the value at display-text size instead of numeral size. */
  textValue?: boolean;
  /** Varies the deterministic day strip between cards. */
  seed?: number;
  /** Shown when the behaviour behind the card is scarce. Earned, never bought. */
  rarity?: string;
  /** The card's own URL. Every card has one — that is the whole loop. */
  slug: string;
};

const cell = (i: number, seed: number) =>
  Math.sin(i * (1.3 + seed * 0.4)) + Math.cos(i * 0.61);

/**
 * A rendered share card — ink field in both modes via --share-* tokens.
 * Label, readout, the sentence, the receipt strip, and the URL it unfurls
 * from. The strip is the proof: the number came from somewhere.
 */
export function ShareCard({
  label,
  value,
  tail,
  accent = "moss",
  textValue = false,
  seed = 0,
  rarity,
  slug,
}: ShareCardProps) {
  const valueCls = [
    textValue ? styles.shareVText : styles.shareV,
    accent === "signal" ? styles.shareAccentSignal : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={styles.shareCard}>
      <div className={styles.shareTop}>
        <span className={styles.shareK}>{label}</span>
        {rarity ? <span className={styles.shareRarity}>{rarity}</span> : null}
      </div>
      <div className={styles.shareBody}>
        <div className={valueCls}>{value}</div>
        <div className={styles.shareT}>{tail}</div>
      </div>
      <div className={styles.shareStrip} aria-hidden="true">
        {Array.from({ length: 48 }, (_, i) => {
          const v = cell(i, seed);
          const cls =
            v > 1.3
              ? `${styles.shareCell} ${styles.shareCellSig}`
              : v > -0.7
                ? `${styles.shareCell} ${styles.shareCellOn}`
                : styles.shareCell;
          return <i key={i} className={cls} />;
        })}
      </div>
      <div className={styles.shareFoot}>
        <span className={styles.shareUrl}>bagcheck.app/c/{slug}</span>
        <span className={styles.shareVerified}>verified</span>
      </div>
    </div>
  );
}
