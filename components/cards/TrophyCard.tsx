import { ShareButton } from "@/components/app/ShareButton";
import { Logo } from "@/components/primitives";
import styles from "./TrophyCard.module.css";

/**
 * What the store records about a card. `rare` or nothing — a card is either
 * scarce enough to say so or it is simply a card, and there is no third word
 * the data can support.
 */
export type Rarity = "rare" | null;

export type Trophy = {
  /** The minted card's slug — the card's whole access model and its URL. */
  slug: string;
  type: string;
  rarity: Rarity;
  year: string;
  value: string;
  title: string;
  tail: string;
  /** The instrument the card is about, when it is about one. */
  symbol?: string | null;
};

/**
 * A card in the case, on the ink field in both modes.
 *
 * Rarity is carried by the word, not by a colour — "Rare" is the label and
 * the label is the whole signal. There is no locked variant: this component
 * used to take a `capability` and blur itself behind a "category" paywall,
 * which is a gate `Capability` deliberately has no member for. Minting,
 * sharing and rarity are never paywalled, and a component that can express a
 * gate the tier model refuses to write is a component that will get one
 * written.
 *
 * It also used to print "Held by N% of members", which is a claim about a
 * member base nothing measures. What a card is held by is the reader's own
 * conduct, and that is what it says.
 */
export function TrophyCard({ trophy }: { trophy: Trophy }) {
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        {/* The same word the card itself wears, so one thing has one name. */}
        <span className={styles.rarity} data-rarity={trophy.rarity ?? undefined}>
          {trophy.rarity ? "Scarce" : "Minted"}
        </span>
        <span className={styles.year}>{trophy.year}</span>
      </div>

      <div className={styles.body}>
        {trophy.symbol ? (
          <span className={styles.symbolMark}>
            <Logo symbol={trophy.symbol} size={26} />
            <span>{trophy.symbol}</span>
          </span>
        ) : null}
        <div className={`num ${styles.value}`}>{trophy.value}</div>
        <div className={styles.title}>{trophy.title}</div>
        <p className={styles.tail}>{trophy.tail}</p>
      </div>

      <div className={styles.foot}>
        <a className={styles.held} href={`/c/${trophy.slug}`}>
          Earned by your conduct
        </a>
        <ShareButton
          type={trophy.type}
          slug={trophy.slug}
          label={trophy.title}
          size={34}
          onInk
        />
      </div>
    </article>
  );
}
