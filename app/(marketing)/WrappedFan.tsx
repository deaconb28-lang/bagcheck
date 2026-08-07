import { ShareCard } from "./ShareCard";
import styles from "./marketing.module.css";

/**
 * Three earned cards, dealt like a hand — the product's collectible
 * mechanic made literal. Centre card on top.
 */
export function WrappedFan() {
  return (
    <div className={styles.fanWrap}>
      <div className={`${styles.fanCard} ${styles.fanLeft}`}>
        <ShareCard
          label="Bagcheck · Q3 report"
          value="0"
          tail="panic sells in a quarter that gave you three chances"
          seed={1}
        />
      </div>
      <div className={`${styles.fanCard} ${styles.fanRight}`}>
        <ShareCard
          label="Bagcheck · archetype"
          value="The Holder"
          tail="long holds, quiet drawdowns, contributions on schedule"
          accent="signal"
          textValue
          seed={2}
        />
      </div>
      <div className={`${styles.fanCard} ${styles.fanCenter}`}>
        <ShareCard
          label="Bagcheck · 2026"
          value="412"
          tail="days holding — your longest yet"
          seed={0}
        />
      </div>
    </div>
  );
}
