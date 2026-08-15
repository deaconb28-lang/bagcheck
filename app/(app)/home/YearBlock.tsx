import Link from "next/link";
import { WrappedCard } from "@/components/cards/WrappedCard";
import { Teaser } from "@/components/cards/Teaser";
import { deckFrames, earnedCount } from "@/lib/cards";
import type { CardSpec, Frame } from "@/lib/cards";
import styles from "./year-block.module.css";

/**
 * The year, leading the dashboard.
 *
 * Wrapped was a route you had to already know about, reachable from one glyph
 * on a seven-glyph rail — which made the product's most shareable surface, and
 * the thing the landing page actually sells, the least-visited screen in it.
 * It is the first thing on Home now.
 *
 * It shows **the whole set**, earned and unearned, for the same reason
 * `/wrapped` does: a young account earns three or four cards, and a strip that
 * shows only those reads as a thin product rather than as a year in progress.
 * An unearned frame carries its drawing and the one condition that mints it —
 * shapes, never a figure, because a plausible number on a locked card would
 * undermine every real one beside it.
 *
 * The rail is the deck's, not a second grammar: same full-bleed inset, same
 * snap, same frame numbers. Reading one is still `/wrapped`'s job — every
 * frame here is a link there rather than a player.
 */
export function YearBlock({
  year,
  cards,
  photos,
}: {
  year: string;
  cards: CardSpec[];
  photos: Record<string, { url: string; color: string }>;
}) {
  const frames = deckFrames(cards);
  const earned = earnedCount(frames);

  return (
    <section data-reveal className={styles.block} aria-labelledby="year-block">
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
          <li key={frame.kind} className={styles.frame}>
            <Link
              href="/wrapped"
              className={styles.slot}
              aria-label={
                frame.card
                  ? `${frame.card.kicker} ${frame.card.headline} — open your Wrapped`
                  : `${frame.name} — not earned yet`
              }
            >
              {frame.card ? (
                <WrappedCard
                  eyebrow={frame.card.eyebrow}
                  kicker={frame.card.kicker}
                  headline={frame.card.headline}
                  lede={frame.card.lede}
                  body={frame.card.body}
                  kind={frame.card.kind}
                  photo={photos[frame.card.kind] ?? null}
                  hue={frame.card.hue}
                  layout={frame.card.layout}
                  symbol={frame.card.symbol}
                  rarity={frame.card.rarity}
                  slug={null}
                  provenance="Read-only brokerage data via SnapTrade"
                  example={false}
                />
              ) : (
                <Locked frame={frame} />
              )}
            </Link>

            <span className={styles.caption}>
              <span className={styles.no}>{String(frame.no).padStart(2, "0")}</span>
              <span className={styles.name}>
                {frame.card ? `${frame.card.kicker} ${frame.card.headline}` : frame.name}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A frame that has not been minted: its drawing, its name, its condition. */
function Locked({ frame }: { frame: Frame }) {
  return (
    <div className={styles.locked}>
      <span className={styles.lockArt}>
        <Teaser kind={frame.teaser} />
      </span>
      <span className={styles.lockName}>{frame.name}</span>
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
