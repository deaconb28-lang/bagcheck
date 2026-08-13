"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WrappedCard } from "@/components/cards/WrappedCard";
import { StoryViewer } from "@/components/cards/StoryViewer";
import { ShareButton } from "@/components/app/ShareButton";
import { deckFrames, earnedCount, firstEarned } from "@/lib/cards";
import type { CardSpec, Frame } from "@/lib/cards";
import styles from "./deck.module.css";

/**
 * Your year, as one deck you scroll.
 *
 * Two builds got this wrong in opposite directions. The first was a snap rail
 * that showed one and a half cards on a desktop and navigated by thirteen
 * anonymous dashes. The second — a cover in a hero beside the year, the rest
 * in a grid below — fixed the navigation and broke the impression: on a real
 * account that had earned two cards it rendered one hero, one lonely tile
 * under a heading that said "1 more card", and a thousand pixels of empty
 * field. The screen whose whole job is *look how much you got* was the emptiest
 * screen in the product.
 *
 * So: the deck leads, it is horizontal, and **it is always the full set**.
 * Cards the ledger has earned are live; the rest hold their place with the one
 * condition that mints them. Nothing is invented — a locked frame states a
 * requirement, never a figure — and the reader sees the whole shape of the
 * year on the first screen instead of the two corners of it they happen to
 * have reached.
 *
 * The frame number is load-bearing: the deck, the player and the roster share
 * one order, so a reader can say "nine" and mean one thing.
 */
export function Deck({
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
  photos?: Record<string, { url: string; color: string }>;
  year: string;
  stat: string;
}) {
  const frames = deckFrames(cards);
  const earned = earnedCount(frames);
  const openAt = firstEarned(frames);
  const cover = frames[openAt]?.card ?? null;

  const [at, setAt] = useState<number | null>(null);
  const rail = useRef<HTMLOListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  /* Which arrows are live. A disabled arrow is quieter than a dead one. */
  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = rail.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  /* One press moves about a screenful, landing on a card edge. */
  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const step = el.querySelector("li")?.getBoundingClientRect().width ?? 280;
    el.scrollBy({ left: dir * Math.max(step + 18, el.clientWidth * 0.8), behavior: "smooth" });
  };

  /*
   * Closing the player leaves the reader on the frame they stopped at. The
   * deck and the player are two views of one order, so the position survives
   * moving between them.
   */
  const close = useCallback((landedOn: number) => {
    setAt(null);
    rail.current?.children[landedOn]?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, []);

  /* The player only ever opens on a frame that has a card. */
  const open = (i: number) => {
    if (frames[i]?.card) setAt(i);
  };

  return (
    <section className={styles.deck} aria-labelledby="year">
      <header className={styles.head}>
        <div className={styles.lockup}>
          <span className={styles.kicker}>{example ? "Sample year" : "Wrapped"}</span>
          <h1 className={styles.year} id="year">
            {year}
          </h1>
          <p className={styles.stat}>{stat}</p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.play}
            onClick={() => open(openAt)}
            disabled={!cover}
          >
            <Play />
            Play your year
          </button>
          {cover && !example ? (
            <ShareButton type={cover.kind} label={cover.headline} size={48} />
          ) : null}

          <span className={styles.count}>
            <b>{earned}</b> of {frames.length} earned
          </span>

          <span className={styles.arrows}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => nudge(-1)}
              disabled={edge.start}
              aria-label="Scroll the deck back"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => nudge(1)}
              disabled={edge.end}
              aria-label="Scroll the deck forward"
            >
              <Chevron dir="right" />
            </button>
          </span>
        </div>
      </header>

      <ol className={styles.rail} ref={rail} onScroll={measure}>
        {frames.map((frame, i) => (
          <li key={frame.kind} className={styles.frame}>
            {frame.card ? (
              <button
                type="button"
                className={styles.live}
                onClick={() => open(i)}
                aria-label={`Open ${frame.card.kicker} ${frame.card.headline}`}
              >
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
                  provenance={provenance}
                  example={example}
                />
              </button>
            ) : (
              <Locked frame={frame} />
            )}

            <span className={styles.caption}>
              <span className={styles.no}>{String(frame.no).padStart(2, "0")}</span>
              <span className={styles.name}>
                {frame.card ? `${frame.card.kicker} ${frame.card.headline}` : frame.name}
              </span>
              {frame.card?.rarity ? <span className={styles.scarce}>Scarce</span> : null}
            </span>
          </li>
        ))}
      </ol>

      <p className={styles.prov}>{provenance}</p>

      {at !== null ? (
        <StoryViewer
          cards={frames.filter((f) => f.card).map((f) => f.card!)}
          startAt={frames.slice(0, at).filter((f) => f.card).length}
          photos={photos}
          provenance={provenance}
          example={example}
          year={Number(year) || new Date().getUTCFullYear()}
          onClose={(landed) => {
            /* The player counts earned cards; the deck counts frames. */
            const earnedFrames = frames.filter((f) => f.card);
            const kind = earnedFrames[Math.max(0, Math.min(landed, earnedFrames.length - 1))]?.kind;
            close(Math.max(0, frames.findIndex((f) => f.kind === kind)));
          }}
        />
      ) : null}
    </section>
  );
}

/**
 * A frame that has not been minted.
 *
 * It states the one condition that opens it and nothing else. No figure, no
 * placeholder number, no blurred readout pretending to be data — the whole
 * claim of a card is that its numbers came off a brokerage, and a fake one
 * sitting beside the real ones cheapens both.
 */
function Locked({ frame }: { frame: Frame }) {
  return (
    <div className={styles.locked} aria-label={`${frame.name} — not earned yet`}>
      <span className={styles.lockMark} aria-hidden="true">
        <LockGlyph />
      </span>
      <span className={styles.lockName}>{frame.name}</span>
      <span className={styles.lockNeed}>{frame.requires}</span>
    </div>
  );
}

function Play() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.7-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2z" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="10.5" rx="3" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}
