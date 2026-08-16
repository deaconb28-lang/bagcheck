import Link from "next/link";
import { CARDS } from "@/wrapped/cards.mjs";
import { CardFonts } from "@/components/cards/CardFonts";
import { Teaser } from "@/components/cards/Teaser";
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
 * It shows **the whole set**, earned and unearned, for the same reason
 * `/wrapped` does: a young account earns three or four cards, and a strip that
 * shows only those reads as a thin product rather than as a year in progress.
 * An unearned frame carries its drawing and the one condition that mints it —
 * shapes, never a figure, because a plausible number on a locked card would
 * undermine every real one beside it.
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
  const have = new Map(cards.map((c) => [c.no, c]));
  const frames = ROSTER.map((r) => ({ ...r, card: have.get(r.no) ?? null }));
  const earned = cards.length;

  return (
    <section data-reveal className={styles.block} aria-labelledby="year-block">
      <CardFonts />
      <span className={styles.eyebrow}>Wrapped · {year}</span>

      <div className={styles.headRow}>
        <h2 className={styles.h2} id="year-block">
          {earned === frames.length
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
        <b>{earned}</b> of {frames.length} cards earned.{" "}
        {earned === 0
          ? "Each one mints itself once your history can prove it."
          : "Every one comes off read-only brokerage data, and sharing is never behind a plan."}
      </p>

      <ol className={styles.rail}>
        {frames.map((frame) => (
          <li key={frame.no} className={styles.frame}>
            <Link
              href="/wrapped"
              className={styles.slot}
              aria-label={
                frame.card ? `${frame.title} — open your Wrapped` : `${frame.title} — not earned yet`
              }
            >
              {frame.card ? (
                <span className={styles.stage}>
                  {/*
                    The card itself, framed rather than redrawn. It is a
                    1080x1920 document with its own stylesheet and faces, and
                    the wrapper scales it — so this rail and the player on
                    `/wrapped` are one drawing at two magnifications.
                  */}
                  <iframe
                    className={styles.paper}
                    srcDoc={frame.card.html}
                    title={frame.card.caption || frame.title}
                    loading="lazy"
                    tabIndex={-1}
                    scrolling="no"
                  />
                </span>
              ) : (
                <Locked frame={frame} />
              )}
            </Link>

            <span className={styles.caption}>
              <span className={styles.no}>{frame.no}</span>
              <span className={styles.name}>{frame.title}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A frame that has not been minted: its drawing, its name, its condition. */
function Locked({ frame }: { frame: { title: string; teaser: string; requires: string } }) {
  return (
    <div className={styles.locked}>
      <span className={styles.lockArt}>
        <Teaser kind={frame.teaser as never} />
      </span>
      <span className={styles.lockName}>{frame.title}</span>
      <span className={styles.lockNeed}>{frame.requires}</span>
    </div>
  );
}

function Play() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.7-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2z" />
    </svg>
  );
}
