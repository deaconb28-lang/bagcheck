import { Avatar } from "@/components/primitives";
import type { Archetype } from "@/lib/archetypes";
import styles from "./WrappedCard.module.css";

export type WrappedCardProps = {
  year: number;
  archetype: Archetype;
  /** Whether generated avatar art exists on this deployment. */
  avatarArt?: boolean;
  /** The headline figure. Set in the serif at numeral size. */
  value: string;
  /** What the figure measures — mono, above it. */
  eyebrow: string;
  /** One line under the figure, carrying a specific comparison. */
  tail: string;
  /**
   * The receipt: one cell per session behind the number. Real values, never a
   * pattern — the strip is the only part of a share card that shows its work,
   * so a decorative one would undo the point of the card.
   */
  strip: number[];
  /** The card's own URL once minted. Null before it exists. */
  slug: string | null;
  /** Generated backdrop, when the card has been minted with one. */
  backdrop?: string | null;
  /** Earned by behaviour — a 20% drawdown held, not a purchase. */
  rarity?: "rare" | null;
  /**
   * Marks the card as an illustration rather than a record. Set on the
   * marketing page, where the figures are not anyone's. Never set in-app.
   */
  example?: boolean;
};

const CELLS = 48;

/**
 * The Wrapped card, as it actually renders.
 *
 * One component for the in-app card and the one on the marketing page, so the
 * thing people are shown before signing up is the thing they get. The layout
 * matches `app/og/[slug]/render.tsx`, which is what the URL unfurls as —
 * Satori cannot share this stylesheet, so the two are kept in step by hand.
 *
 * It stays on the ink field in both modes via the `--share-*` tokens: a card
 * is minted to leave the app, and it should look the same wherever it lands.
 */
export function WrappedCard({
  year,
  archetype,
  avatarArt = false,
  value,
  eyebrow,
  tail,
  strip,
  slug,
  backdrop = null,
  rarity = null,
  example = false,
}: WrappedCardProps) {
  /*
   * Scaled against the largest absolute move in the window, so a quiet month
   * and a violent one both fill the strip. Three states and no gradient:
   * a session was up, down, or flat.
   */
  const peak = Math.max(1, ...strip.map((v) => Math.abs(v)));
  const cells = Array.from({ length: CELLS }, (_, i) => strip[i] ?? 0);

  return (
    <div className={styles.card}>
      {backdrop ? (
        // eslint-disable-next-line @next/next/no-img-element -- stored PNG at
        // a fixed URL, sized by the card; next/image buys nothing here.
        <img src={backdrop} alt="" className={styles.backdrop} />
      ) : null}

      <div className={styles.top}>
        <span className={styles.k}>Bagcheck · {year}</span>
        <div className={styles.topRight}>
          {example ? <span className={styles.example}>Example</span> : null}
          {/* Rarity is carried by the word, never by a colour. */}
          {rarity ? <span className={styles.rarity}>Scarce</span> : null}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.identity}>
          <Avatar archetype={archetype.key} size={44} art={avatarArt} />
          <div className={styles.identityText}>
            <span className={styles.archetype}>{archetype.name}</span>
            <span className={styles.eyebrow}>{eyebrow}</span>
          </div>
        </div>
        <div className={`num ${styles.value}`}>{value}</div>
        <p className={styles.tail}>{tail}</p>
      </div>

      <div className={styles.strip} aria-hidden="true">
        {cells.map((v, i) => (
          <i
            key={i}
            className={styles.cell}
            data-state={v > 0 ? "up" : v < 0 ? "down" : "flat"}
            style={{ "--h": `${Math.round((Math.abs(v) / peak) * 100)}%` } as React.CSSProperties}
          />
        ))}
      </div>

      <div className={styles.foot}>
        <span className={styles.url}>{slug ? `bagcheck.app/c/${slug}` : "minted when you share"}</span>
        <span className={styles.verified}>read-only</span>
      </div>
    </div>
  );
}
