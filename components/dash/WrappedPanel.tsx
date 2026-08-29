import Link from "next/link";
import styles from "./wrappedPanel.module.css";

/**
 * ── Your year, on the screen you are already on ──
 *
 * The dashboard talked about Wrapped three times and never once showed it: a
 * notice announcing a count, a promo tile with a percentage on a gradient, and
 * twelve teaser frames carrying drawn shapes. All three are *descriptions of*
 * an artefact by a product whose whole pitch is the artefact. A reader who has
 * never opened `/wrapped` had no way to know what was behind the door, and the
 * commonest reaction to a door with a number on it is not to open it.
 *
 * So the cards are here, as cards. Each one is the finished 1080×1920 document
 * the deck renders — framed in an `iframe` with `srcdoc`, never re-drawn,
 * because a card carries its own stylesheet, faces and palette and flattening
 * one into app markup would be two vocabularies fighting. The frame scales the
 * stage, so this is the same drawing the player shows at a different
 * magnification.
 *
 * `--card-w` is a plain number and every length derives from it: `scale()`
 * takes a ratio, and `calc(300px / 1080)` is a *length*, which invalidates the
 * whole transform rather than failing loudly. That is how the deck once drew a
 * row of top-left crops with no words on them.
 *
 * It is a fan, not a rail and not a pile. A pile shows one card, which is the
 * right shape on the screen built for reading them and the wrong one here,
 * where the point is *how much of this exists*. A rail of equals is a contact
 * sheet. Three overlapping, the first fully out, says both.
 *
 * Nothing here is interactive: the whole block is one link into the deck. An
 * affordance that half-works — a card you can drag but not open — is worse
 * than a picture.
 */
export function WrappedPanel({
  year,
  earned,
  total,
  cards,
}: {
  year: number;
  earned: number;
  total: number;
  cards: Array<{ no: string; key: string; html: string }>;
}) {
  if (!cards.length) return null;

  /* Three is what fits a fan at a size the type on a card is still readable. */
  const shown = cards.slice(0, 3);

  return (
    <section className={styles.block} aria-labelledby="wrappedPanel">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Wrapped · {year}</p>
        <h2 className={styles.title} id="wrappedPanel">
          Your year, in {earned} card{earned === 1 ? "" : "s"}
        </h2>
        <p className={styles.tail}>
          {earned === total
            ? "Every frame the set has, minted off your own ledger."
            : `${earned} of ${total} so far. Each one mints itself as the year gives it something to say.`}
        </p>
        <Link href="/wrapped" className={styles.door}>
          Play your year
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/*
        * The fan is decoration in the accessibility tree — every card's own
        * content is behind the link beside it, and three nested documents
        * announced in sequence is a reader being read three posters they
        * cannot navigate.
        */}
      <Link href="/wrapped" className={styles.fan} aria-hidden="true" tabIndex={-1}>
        {shown.map((card, i) => (
          <span className={styles.slot} key={card.no} style={{ ["--i" as string]: i }}>
            <iframe
              className={styles.paper}
              title={`Wrapped card ${card.no}`}
              srcDoc={card.html}
              scrolling="no"
              tabIndex={-1}
            />
          </span>
        ))}
      </Link>
    </section>
  );
}
