import { WrappedCard } from "@/components/cards/WrappedCard";
import { archetypeByKey } from "@/lib/archetypes";
import { ShareCard } from "./ShareCard";
import styles from "./marketing.module.css";

/*
 * The strip on the centre card is a fixed series, generated once here rather
 * than sampled from anyone. It is marked "Example" on the card for exactly
 * that reason: the whole argument of this section is that Bagcheck's numbers
 * come from a brokerage, so an illustration must say that it is one.
 */
const EXAMPLE_STRIP = Array.from({ length: 48 }, (_, i) =>
  Math.round((Math.sin(i * 0.7) * 1.6 + Math.cos(i * 0.31) - 0.25) * 140),
);

/**
 * Three earned cards, dealt like a hand — the collectible mechanic made
 * literal. The centre card is the rare one, and it sits on top because
 * scarcity here is a fact about the behaviour, not a purchase.
 *
 * The centre is the real `<WrappedCard>`, the same component the app renders
 * and the same one the minted URL unfurls as. What someone is shown before
 * signing up is the thing they get.
 */
export function WrappedFan({ avatarArt = false }: { avatarArt?: boolean }) {
  const archetype = archetypeByKey("sentinel");
  if (!archetype) return null;

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
        <WrappedCard
          year={2026}
          archetype={archetype}
          avatarArt={avatarArt}
          eyebrow="Longest hold"
          value="412"
          tail="days on one position — longer than you have held anything before."
          strip={EXAMPLE_STRIP}
          slug="412-days"
          rarity="rare"
          example
        />
      </div>
    </div>
  );
}
