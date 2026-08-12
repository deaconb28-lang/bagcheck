"use client";

import { useCallback, useRef, useState } from "react";
import { WrappedCard } from "@/components/cards/WrappedCard";
import { StoryViewer } from "@/components/cards/StoryViewer";
import { ShareButton } from "@/components/app/ShareButton";
import type { CardSpec } from "@/lib/cards";
import styles from "./wrapped.module.css";

/**
 * Your year, as a contact sheet.
 *
 * **The screen shows the whole set, and the player reads one.** The build
 * before this was a horizontal snap rail: on a phone it was fine, and on a
 * 1440px display it spent a third of the width on an empty gutter, showed one
 * and a half cards out of thirteen, and navigated by thirteen anonymous
 * three-pixel dashes. A reader could not tell what they had, what was next,
 * or how to reach card nine — on the one screen whose entire job is "look how
 * much you got".
 *
 * So browsing and reading are separated. The page is the sheet: the cover in a
 * hero beside the year, then the rest in a grid, each under a frame number and
 * its name. Reading is the player that was already built for it — press play
 * to watch the year, or open any single card and land on that frame.
 *
 * The frame numbers are the structural device and they are not decoration:
 * these cards are a numbered set, the player counts through them in the same
 * order, and the number is how a reader says which one they mean.
 */
export function Gallery({
  cards,
  example,
  provenance,
  photos = {},
  year,
  stat,
}: {
  cards: CardSpec[];
  example: boolean;
  provenance: string;
  /** Photographic grounds by kind, read from the store by the page. */
  photos?: Record<string, { url: string; color: string }>;
  year: string;
  /** The one line of machine facts under the year. */
  stat: string;
}) {
  /*
   * The annual summary leads: it is the only card about the whole year rather
   * than one thing inside it, which makes it the cover.
   */
  const deck = [
    ...cards.filter((c) => c.kind === "wrapped"),
    ...cards.filter((c) => c.kind !== "wrapped"),
  ];
  const cover = deck[0];
  const rest = deck.slice(1);

  const [at, setAt] = useState<number | null>(null);
  const sheet = useRef<HTMLOListElement>(null);

  /*
   * Closing the player leaves the reader on the frame they stopped at rather
   * than at the top of the page — the sheet and the player are two views of
   * one order, so the position survives moving between them.
   */
  const close = useCallback((landedOn: number) => {
    setAt(null);
    const el = sheet.current?.children[Math.max(0, landedOn - 1)];
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  return (
    <>
      {/* ── The cover, and what the year came to ── */}
      <section className={styles.hero} aria-labelledby="year">
        <button
          type="button"
          className={styles.coverCard}
          onClick={() => setAt(0)}
          aria-label={`Open ${cover.kicker} ${cover.headline}`}
        >
          <Card card={cover} photos={photos} provenance={provenance} example={example} />
        </button>

        <div className={styles.lockup}>
          <span className={styles.kicker}>{cover.kicker}</span>
          <h1 className={styles.year} id="year">
            {year}
          </h1>
          <p className={styles.stat}>{stat}</p>

          <div className={styles.heroActions}>
            <button type="button" className={styles.play} onClick={() => setAt(0)}>
              <Play />
              Play your year
            </button>
            {example ? null : (
              <ShareButton type={cover.kind} label={cover.headline} size={52} />
            )}
          </div>

          <p className={styles.prov}>{provenance}</p>
        </div>
      </section>

      {/* ── The set ── */}
      <section className={styles.set} aria-label="Every card in the set">
        <div className={styles.setHead}>
          <h2 className={styles.setTitle}>The set</h2>
          <span className={styles.setCount}>
            {rest.length} more {rest.length === 1 ? "card" : "cards"}
          </span>
        </div>

        <ol className={styles.sheet} ref={sheet}>
          {rest.map((c, i) => (
            <li key={c.kind} className={styles.frame} data-reveal>
              <button
                type="button"
                className={styles.frameCard}
                onClick={() => setAt(i + 1)}
                aria-label={`Open ${c.kicker} ${c.headline}`}
              >
                <Card card={c} photos={photos} provenance={provenance} example={example} />
              </button>
              <span className={styles.caption}>
                {/* The frame number, the name, and scarcity where it was
                    earned — the three facts you need to pick one out. */}
                <span className={styles.no}>{String(i + 2).padStart(2, "0")}</span>
                <span className={styles.name}>
                  {c.kicker} {c.headline}
                </span>
                {c.rarity ? <span className={styles.scarce}>Scarce</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {at !== null ? (
        <StoryViewer
          cards={deck}
          startAt={at}
          photos={photos}
          provenance={provenance}
          example={example}
          year={Number(year) || new Date().getUTCFullYear()}
          onClose={close}
        />
      ) : null}
    </>
  );
}

/** One card, at whatever size its cell gives it. */
function Card({
  card,
  photos,
  provenance,
  example,
}: {
  card: CardSpec;
  photos: Record<string, { url: string; color: string }>;
  provenance: string;
  example: boolean;
}) {
  return (
    <WrappedCard
      eyebrow={card.eyebrow}
      kicker={card.kicker}
      headline={card.headline}
      lede={card.lede}
      body={card.body}
      kind={card.kind}
      photo={photos[card.kind] ?? null}
      hue={card.hue}
      layout={card.layout}
      symbol={card.symbol}
      rarity={card.rarity}
      slug={null}
      provenance={provenance}
      example={example}
    />
  );
}

function Play() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.7-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2z" />
    </svg>
  );
}
