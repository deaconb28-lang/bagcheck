import { ShareCard } from "./ShareCard";
import styles from "./marketing.module.css";

/**
 * Three earned cards, dealt like a hand — the collectible mechanic made
 * literal. The centre card is the rare one, and it sits on top because
 * scarcity here is a fact about the behaviour, not a purchase.
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
          slug="q3-no-panic"
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
          slug="archetype-holder"
        />
      </div>
      <div className={`${styles.fanCard} ${styles.fanCenter}`}>
        <ShareCard
          label="Bagcheck · 2026"
          value="412"
          tail="days holding — your longest yet"
          seed={0}
          rarity="rare"
          slug="412-days"
        />
      </div>
    </div>
  );
}
