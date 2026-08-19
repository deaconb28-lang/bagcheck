import { CARDS } from "@/wrapped/cards.mjs";
import { Teaser } from "@/components/cards/Teaser";
import type { TeaserKind } from "@/components/cards/Teaser";
import styles from "./collection.module.css";

/**
 * ── The set ──
 *
 * Twelve frames, and which of them the ledger has proved. The dashboard knew
 * the count already ("4 of 12") and said it in a sentence on a promo tile,
 * which is the least legible form a collection can take: a set is a thing you
 * see the shape of.
 *
 * Nothing here is a gate and nothing is a projection. An unminted frame states
 * the one condition that mints it, wears its drawn teaser, and carries **no
 * numerals** — a ring with a gap says *a score*, it does not say 82. That rule
 * is the same one `<StillToCome>` follows under the deck, and it exists
 * because a plausible figure beside real ones is worse than no figure at all
 * on the screen whose whole claim is that its numbers came off a brokerage.
 *
 * A minted frame is a link into the deck rather than a rendering of the card:
 * a card is a finished 1080×1920 document with its own stylesheet, and
 * flattening one into a 90px tile would be two vocabularies fighting.
 */

const ROSTER = CARDS as unknown as Array<{
  no: string;
  title: string;
  teaser: string;
  requires: string;
}>;

export function Collection({ year, earnedNos }: { year: number; earnedNos: string[] }) {
  const have = new Set(earnedNos);
  const earned = ROSTER.filter((card) => have.has(card.no));
  const left = ROSTER.filter((card) => !have.has(card.no));

  return (
    <section className={styles.block} aria-labelledby="collection">
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>The set · {year}</p>
          <h2 className={styles.title} id="collection">
            {earned.length
              ? `${earned.length} of ${ROSTER.length} minted`
              : `Nothing minted yet`}
          </h2>
        </div>
        <a className={styles.door} href="/wrapped">
          Play your year →
        </a>
      </div>

      <ul className={styles.grid}>
        {ROSTER.map((card, i) => {
          const minted = have.has(card.no);
          return (
            <li
              key={card.no}
              className={styles.frame}
              data-minted={minted || undefined}
              /*
               * A capped cascade: twelve frames land inside the 300ms an
               * arrival is allowed, and a longer roster would not slow the
               * last one down.
               */
              style={{ animationDelay: `${Math.min(i * 28, 300)}ms` }}
            >
              <a className={styles.link} href="/wrapped" aria-label={`${card.title}, frame ${card.no}`}>
                <span className={styles.no}>{card.no}</span>
                <span className={styles.art} aria-hidden="true">
                  <Teaser kind={card.teaser as TeaserKind} />
                </span>
                <span className={styles.name}>{card.title}</span>
                {/*
                  * The condition, never a date and never a figure. A minted
                  * frame says nothing here — the card itself is the statement.
                  */}
                <span className={styles.need}>{minted ? "Minted" : card.requires}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <p className={styles.foot}>
        {left.length
          ? `${left.length} appear when your ledger can support them. Never a projection.`
          : "Every frame this year can mint is minted."}
      </p>
    </section>
  );
}
