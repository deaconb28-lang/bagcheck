import { ShareButton } from "@/components/app/ShareButton";
import { TIER_LABEL, tierFor } from "@/lib/tiers";
import type { Capability } from "@/lib/tiers";
import styles from "./TrophyCard.module.css";

export type Rarity = "common" | "uncommon" | "rare" | "scarce";

export type Trophy = {
  id: string;
  /** The minted card's slug, when it has one. */
  slug?: string;
  type: string;
  rarity: Rarity;
  year: string;
  value: string;
  title: string;
  tail: string;
  /** Share of members holding this card. Rarity means nothing without one. */
  heldBy: number | null;
};

type TrophyCardProps =
  | { trophy: Trophy; locked?: false; capability?: never }
  | { trophy: Trophy; locked: true; capability: Capability };

/**
 * A card in the case, on the ink field in both modes.
 *
 * Rarity is carried by the word, not by a colour — "Scarce" is the label and
 * the label is the whole signal. A locked card blurs and offers the category;
 * it does not offer a share button, because the affordance must be absent
 * rather than refuse.
 */
export function TrophyCard(props: TrophyCardProps) {
  const { trophy } = props;
  const locked = props.locked === true;

  return (
    <article className={styles.card} data-locked={locked || undefined}>
      <div className={styles.top}>
        <span className={styles.rarity} data-rarity={trophy.rarity}>
          {locked ? `${TIER_LABEL[tierFor(props.capability!)]} category` : trophy.rarity}
        </span>
        <span className={styles.year}>{trophy.year}</span>
      </div>

      <div className={styles.body} data-blur={locked || undefined}>
        <div className={`num ${styles.value}`}>{trophy.value}</div>
        <div className={styles.title}>{trophy.title}</div>
        <p className={styles.tail}>{trophy.tail}</p>
      </div>

      <div className={styles.foot}>
        <span className={styles.held}>
          {locked
            ? "Unlock the category"
            : trophy.heldBy != null
              ? `Held by ${trophy.heldBy < 1 ? "<1" : Math.round(trophy.heldBy)}% of members`
              : "Earned by your conduct"}
        </span>
        {locked ? (
          <a className={styles.unlock} href="/profile#plan">
            Unlock category
          </a>
        ) : (
          <ShareButton type={trophy.type} slug={trophy.slug} label={trophy.title} size={34} onInk />
        )}
      </div>
    </article>
  );
}
