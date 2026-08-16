import { CARDS } from "@/wrapped/cards.mjs";
import { Teaser } from "@/components/cards/Teaser";
import type { TeaserKind } from "@/components/cards/Teaser";
import styles from "./stilltocome.module.css";

/**
 * The cards this year has not minted yet — a list, never a second deck.
 *
 * They used to be frames in the rail, which made the deck part artefact and
 * part inventory: a reader scrolling their year hit a locked tile between two
 * real cards, and the thing that is meant to feel like a set of posters read
 * as a progress meter. The deck is now only what has been earned, and what has
 * not is stated underneath, in rows.
 *
 * **Every drawing is shapes and carries no numerals.** A teaser with a
 * plausible figure on it would undermine every real figure above it, on the
 * one screen whose entire claim is that its numbers came off a brokerage: a
 * ring with a gap says *a score*, it does not say 82. Each row states the one
 * condition that mints the card and nothing else — a requirement, never a
 * projection, and never a date.
 */

const ROSTER = CARDS as unknown as Array<{
  no: string;
  title: string;
  teaser: string;
  requires: string;
}>;

export function StillToCome({ earned }: { earned: string[] }) {
  const have = new Set(earned);
  const left = ROSTER.filter((c) => !have.has(c.no));
  if (!left.length) return null;

  return (
    <section className={styles.block} aria-labelledby="still">
      <p className={styles.eyebrow}>Not minted yet</p>
      <h2 className={styles.h2} id="still">
        {left.length} more your history has not proved
      </h2>
      <p className={styles.lede}>
        Each one appears in the deck the moment the ledger can support it. None
        of them is a projection — a card states what happened or it does not
        exist.
      </p>

      <ul className={styles.list}>
        {left.map((card) => (
          <li key={card.no} className={styles.row}>
            <span className={styles.no}>{card.no}</span>
            <span className={styles.art} aria-hidden="true">
              <Teaser kind={card.teaser as TeaserKind} />
            </span>
            <span className={styles.name}>{card.title}</span>
            <span className={styles.need}>{card.requires}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
