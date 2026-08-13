import Link from "next/link";
import { WrappedCard } from "@/components/cards/WrappedCard";
import { deckFrames, earnedCount } from "@/lib/cards";
import type { CardSpec } from "@/lib/cards";
import screen from "../screen.module.css";
import styles from "./wrapped-panel.module.css";

/**
 * Wrapped, on the dashboard.
 *
 * It used to be a route you had to already know about, reachable from one
 * glyph on the rail — which meant the product's most shareable surface, the
 * thing the landing page actually sells, was the least-visited screen in it.
 * So the year sits on the dashboard as a panel of its own: the count, the
 * first few cards, and one door.
 *
 * The strip is a preview, not the deck. It shows what has been minted and
 * stops; the full set, its locked frames and the player all live on
 * `/wrapped`, and this panel's job is to make a reader want to go there.
 */
export function WrappedPanel({
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
  const strip = frames.filter((f) => f.card).slice(0, 5);

  return (
    <section data-reveal className={`${screen.panel} ${styles.panel}`}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={screen.eyebrow}>Wrapped · {year}</span>
          <div className={`disp ${styles.title}`}>
            {earned === frames.length
              ? "Your whole year, minted"
              : `${earned} of ${frames.length} cards earned this year`}
          </div>
          <p className={screen.tail}>
            {earned === 0
              ? "Nothing has cleared a sample floor yet. Cards mint themselves as your history gets long enough to prove something."
              : "Every card comes off read-only brokerage data, and sharing is never behind a plan."}
          </p>
        </div>

        <Link href="/wrapped" className={styles.open}>
          Open your Wrapped
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h13" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {strip.length ? (
        <ol className={styles.strip}>
          {strip.map((frame) => (
            <li key={frame.kind} className={styles.slot}>
              <Link
                href="/wrapped"
                className={styles.card}
                aria-label={`${frame.card!.kicker} ${frame.card!.headline} — open your Wrapped`}
              >
                <WrappedCard
                  eyebrow={frame.card!.eyebrow}
                  kicker={frame.card!.kicker}
                  headline={frame.card!.headline}
                  lede={frame.card!.lede}
                  body={frame.card!.body}
                  kind={frame.card!.kind}
                  photo={photos[frame.card!.kind] ?? null}
                  hue={frame.card!.hue}
                  layout={frame.card!.layout}
                  symbol={frame.card!.symbol}
                  rarity={frame.card!.rarity}
                  slug={null}
                  provenance="Read-only brokerage data via SnapTrade"
                  example={false}
                />
              </Link>
            </li>
          ))}

          {/* What is still out there, stated as a count rather than as a tease. */}
          {frames.length - earned > 0 ? (
            <li className={styles.slot}>
              <Link href="/wrapped" className={styles.more}>
                <span className={`num ${styles.moreNum}`}>{frames.length - earned}</span>
                <span className={styles.moreLabel}>
                  still to earn
                </span>
                <span className={styles.moreTail}>
                  See what mints each one
                </span>
              </Link>
            </li>
          ) : null}
        </ol>
      ) : null}
    </section>
  );
}
