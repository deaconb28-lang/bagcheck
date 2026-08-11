"use client";

import { useEffect, useRef, useState } from "react";
import { WrappedCard } from "@/components/cards/WrappedCard";
import { ShareButton } from "@/components/app/ShareButton";
import type { CardSpec } from "@/lib/cards";
import styles from "./wrapped.module.css";

/**
 * Wrapped, in reading mode.
 *
 * Two ways through the same twelve cards, because two things happen here and
 * they want opposite layouts. **Play** is the artefact: one card at a time,
 * full height, arrow keys and swipe, the way a story is read. **Grid** is the
 * contact sheet: every card at once, so someone who came to post can find the
 * one they want without stepping through eleven others.
 *
 * Play is the default on a phone and grid on a desktop, which is where each
 * one is actually better — but the toggle is always there, because the
 * default is a guess about intent and the reader knows theirs.
 *
 * Sharing is never gated. Every card carries its own button; tapping it mints
 * that kind server-side and opens the sheet, so the card that gets posted is
 * recomputed from the ledger rather than assembled by the client.
 */
export function WrappedDeck({
  cards,
  example,
  provenance,
}: {
  cards: CardSpec[];
  example: boolean;
  provenance: string;
}) {
  const [mode, setMode] = useState<"play" | "grid">("grid");
  const [at, setAt] = useState(0);
  const touch = useRef<number | null>(null);

  /*
   * The annual summary leads. It is the only card about the whole year
   * rather than one thing inside it, which makes it the cover — and a deck
   * whose cover is buried at the end is a deck read in the wrong order.
   */
  const deck = [
    ...cards.filter((c) => c.kind === "wrapped"),
    ...cards.filter((c) => c.kind !== "wrapped"),
  ];

  /* Phones get the story by default; the toggle overrides it either way. */
  useEffect(() => {
    if (window.matchMedia("(max-width: 860px)").matches) setMode("play");
  }, []);

  useEffect(() => {
    if (mode !== "play") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setAt((i) => Math.min(deck.length - 1, i + 1));
      if (e.key === "ArrowLeft") setAt((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, deck.length]);

  const card = deck[Math.min(at, deck.length - 1)];

  return (
    <div className={styles.deck}>
      <div className={styles.deckBar}>
        <div className={styles.modes} role="group" aria-label="How to read your cards">
          <button type="button" data-on={mode === "grid" || undefined} onClick={() => setMode("grid")}>
            All at once
          </button>
          <button type="button" data-on={mode === "play" || undefined} onClick={() => setMode("play")}>
            One at a time
          </button>
        </div>
        <span className={styles.count}>
          {mode === "play" ? `${at + 1} of ${deck.length}` : `${deck.length} cards`}
        </span>
      </div>

      {mode === "grid" ? (
        <ol className={styles.grid}>
          {deck.map((c, i) => (
            <li key={c.kind} className={styles.cell} style={{ animationDelay: `${Math.min(i * 0.045, 0.5)}s` }}>
              <div className={styles.cellCard}>
                <WrappedCard
                  eyebrow={c.eyebrow}
                  kicker={c.kicker}
                  headline={c.headline}
                  lede={c.lede}
                  body={c.body}
                  kind={c.kind}
                  hue={c.hue}
                  layout={c.layout}
                  symbol={c.symbol}
                  rarity={c.rarity}
                  slug={null}
                  provenance={provenance}
                  example={example}
                />
              </div>
              {/*
                * No caption. The card already carries its own eyebrow on its
                * face, and repeating it under the frame says the same thing
                * twice in two type sizes.
                */}
              {example ? null : (
                <div className={styles.cellFoot}>
                  <ShareButton type={c.kind} label={c.headline} size={34} />
                  <span>Post this</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div
          className={styles.player}
          onTouchStart={(e) => {
            touch.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touch.current == null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (dx < -50) setAt((i) => Math.min(deck.length - 1, i + 1));
            if (dx > 50) setAt((i) => Math.max(0, i - 1));
            touch.current = null;
          }}
        >
          <div className={styles.ticks} aria-hidden="true">
            {deck.map((c, i) => (
              <span key={c.kind} data-on={i <= at || undefined} />
            ))}
          </div>

          <button
            type="button"
            className={styles.step}
            data-side="back"
            onClick={() => setAt((i) => Math.max(0, i - 1))}
            disabled={at === 0}
            aria-label="Previous card"
          >
            <Chevron dir="left" />
          </button>

          <div className={styles.stage}>
            <div key={card.kind} className={styles.stageCard}>
              <WrappedCard
                eyebrow={card.eyebrow}
                kicker={card.kicker}
                headline={card.headline}
                lede={card.lede}
                body={card.body}
                kind={card.kind}
                hue={card.hue}
                layout={card.layout}
                symbol={card.symbol}
                rarity={card.rarity}
                slug={null}
                provenance={provenance}
                example={example}
              />
            </div>
            {example ? null : (
              <div className={styles.stageFoot}>
                <ShareButton type={card.kind} label={card.headline} size={40} />
                <span>Post this one</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.step}
            data-side="next"
            onClick={() => setAt((i) => Math.min(deck.length - 1, i + 1))}
            disabled={at === deck.length - 1}
            aria-label="Next card"
          >
            <Chevron dir="right" />
          </button>
        </div>
      )}
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
