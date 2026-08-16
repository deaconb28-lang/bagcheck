import Link from "next/link";
import { CARDS } from "@/wrapped/cards.mjs";
import { CardFonts } from "@/components/cards/CardFonts";
import type { ShownCard } from "@/lib/wrapped/year";
import styles from "./year-block.module.css";

/**
 * The year, on the dashboard.
 *
 * Wrapped was a route you had to already know about, reachable from one glyph
 * on a seven-glyph rail — which made the product's most shareable surface, and
 * the thing the landing page actually sells, the least-visited screen in it.
 * It is a block on the dashboard now, and `/wrapped` is the subpage it opens
 * into rather than a destination the reader has to find on a rail.
 *
 * **A pile, never a gallery.** A strip of cards laid out side by side is a
 * contact sheet: it asks the eye to scan a dozen things at once, and at the
 * size a dozen things fit, none of them can be read. A poster is looked at one
 * at a time, so the top card is shown at a size you can actually read and the
 * rest stand behind it as depth. The count says how many there are; the pile
 * says what they are.
 *
 * The unearned ones are a number here rather than a row of locked frames.
 * Reading what mints card nine is `/wrapped`'s job, under the deck, where
 * there is room to state a condition without turning the dashboard into a
 * second roadmap.
 *
 * The rail is the deck's, not a second grammar: same full-bleed inset, same
 * snap, same frame numbers, and — since the pipeline landed — the same twelve
 * documents. It renders what `/wrapped` renders rather than a second drawing
 * of the same year, because two vocabularies for one artefact is how a product
 * ends up disagreeing with itself about what a card looks like.
 *
 * Reading one is still `/wrapped`'s job: every frame here is a link there
 * rather than a player.
 */

/** The full roster, so an unearned frame can still state what mints it. */
const ROSTER = CARDS as unknown as Array<{
  no: string;
  key: string;
  title: string;
  teaser: string;
  requires: string;
}>;

export function YearBlock({ year, cards }: { year: string; cards: ShownCard[] }) {
  const earned = cards.length;
  const total = ROSTER.length;
  /* Top card first, then the three standing behind it. Depth, not a fan. */
  const pile = cards.slice(0, 4);

  return (
    <section data-reveal className={styles.block} aria-labelledby="year-block">
      <CardFonts />
      <span className={styles.eyebrow}>Wrapped · {year}</span>

      <div className={styles.headRow}>
        <h2 className={styles.h2} id="year-block">
          {earned === total
            ? "Your whole year, minted"
            : earned === 0
              ? "Your year, still filling in"
              : "Your year so far"}
        </h2>
        <Link href="/wrapped" className={styles.play}>
          <Play />
          Play your year
        </Link>
      </div>

      <p className={styles.lede}>
        <b>{earned}</b> of {total} cards earned.{" "}
        {earned === 0
          ? "Each one mints itself once your history can prove it."
          : "Every one comes off read-only brokerage data, and sharing is never behind a plan."}
      </p>

      <Link href="/wrapped" className={styles.pile} aria-label="Open your Wrapped">
        {pile.map((card, i) => (
          <span
            key={card.no}
            className={styles.card}
            style={{
              zIndex: pile.length - i,
              transform: `translate(-50%, ${i * 16}px) scale(${(1 - i * 0.055).toFixed(3)})`,
              opacity: i > 2 ? 0 : 1,
            }}
          >
            <iframe
              className={styles.paper}
              srcDoc={card.html}
              title={card.caption || `Card ${card.no}`}
              loading={i === 0 ? "eager" : "lazy"}
              tabIndex={-1}
              scrolling="no"
            />
          </span>
        ))}
      </Link>
    </section>
  );
}

function Play() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.7-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2z" />
    </svg>
  );
}
