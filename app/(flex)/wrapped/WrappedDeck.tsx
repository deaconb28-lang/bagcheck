"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WrappedCard } from "@/components/cards/WrappedCard";
import { ShareButton } from "@/components/app/ShareButton";
import type { CardSpec } from "@/lib/cards";
import styles from "./wrapped.module.css";

/**
 * Wrapped, in reading mode.
 *
 * **The deck is a rail, not a page.** Cards sit in one horizontal
 * scroll-snap track with the neighbours peeking in at both edges, which is
 * the idiom every phone already teaches — swipe. The first build asked the
 * reader to pick between "all at once" and "one at a time" before showing
 * them anything, which is a question about layout dressed up as a question
 * about intent. A rail answers both: the current card is centred and large,
 * and the ones on either side are visibly there to be reached.
 *
 * Native scrolling does the work rather than a transform, so momentum,
 * rubber-banding and the scrollbar all behave the way the platform does.
 * The arrows and the dots drive the same `scrollTo`, so there is exactly one
 * source of truth for where the deck is, and an IntersectionObserver reads
 * the position back rather than a second counter drifting alongside it.
 *
 * Sharing is never gated. The action bar under the rail always acts on the
 * card in view, so the button is in one fixed place instead of repeating on
 * every card and moving as the reader scrolls.
 */
export function WrappedDeck({
  cards,
  example,
  provenance,
  photos = {},
}: {
  cards: CardSpec[];
  example: boolean;
  provenance: string;
  /** Photographic grounds by kind, read from the store by the page. */
  photos?: Record<string, { url: string; color: string }>;
}) {
  /*
   * The annual summary leads: it is the only card about the whole year
   * rather than one thing inside it, which makes it the cover.
   */
  const deck = [
    ...cards.filter((c) => c.kind === "wrapped"),
    ...cards.filter((c) => c.kind !== "wrapped"),
  ];

  const rail = useRef<HTMLOListElement>(null);
  const slides = useRef<Array<HTMLLIElement | null>>([]);
  const [at, setAt] = useState(0);

  /* Read the position back off the rail rather than tracking it in parallel. */
  useEffect(() => {
    const root = rail.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const i = slides.current.indexOf(e.target as HTMLLIElement);
            if (i >= 0) setAt(i);
          }
        }
      },
      { root, threshold: [0.6] },
    );
    slides.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [deck.length]);

  const go = useCallback((i: number) => {
    const target = slides.current[Math.max(0, Math.min(slides.current.length - 1, i))];
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(at + 1);
      if (e.key === "ArrowLeft") go(at - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, go]);

  const card = deck[at] ?? deck[0];

  return (
    <section className={styles.deck} aria-label="Your Wrapped cards">
      <ol className={styles.rail} ref={rail}>
        {deck.map((c, i) => (
          <li
            key={c.kind}
            className={styles.slide}
            ref={(el) => {
              slides.current[i] = el;
            }}
            aria-label={`${i + 1} of ${deck.length}: ${c.headline}`}
          >
            <div className={styles.slideCard} data-at={i === at || undefined}>
              <WrappedCard
                eyebrow={c.eyebrow}
                kicker={c.kicker}
                headline={c.headline}
                lede={c.lede}
                body={c.body}
                kind={c.kind}
                photo={photos[c.kind] ?? null}
                hue={c.hue}
                layout={c.layout}
                symbol={c.symbol}
                rarity={c.rarity}
                slug={null}
                provenance={provenance}
                example={example}
              />
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.dots} role="tablist" aria-label="Jump to a card">
        {deck.map((c, i) => (
          <button
            key={c.kind}
            type="button"
            role="tab"
            aria-selected={i === at}
            aria-label={c.headline}
            className={styles.dot}
            data-on={i === at || undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => go(at - 1)}
          disabled={at === 0}
          aria-label="Previous card"
        >
          <Chevron dir="left" />
        </button>

        {/*
          * The card in view names itself on its own face, so this row does
          * not repeat it. It carries the count — the one fact the card
          * cannot state — and the action.
          */}
        <div className={styles.actionMain}>
          <span className={styles.nowLabel}>
            {at + 1} / {deck.length}
          </span>
          {example ? null : <ShareButton type={card.kind} label={card.headline} size={44} />}
        </div>

        <button
          type="button"
          className={styles.arrow}
          onClick={() => go(at + 1)}
          disabled={at === deck.length - 1}
          aria-label="Next card"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </section>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
