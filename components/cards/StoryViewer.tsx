"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShareButton } from "@/components/app/ShareButton";
import { WrappedCard } from "./WrappedCard";
import type { CardSpec } from "@/lib/cards/kinds";
import styles from "./StoryViewer.module.css";

/** How long a slide holds before it advances itself. */
const DWELL_MS = 5200;
/** The progress bar redraws at this rate. 16ms is a frame; 40 is plenty. */
const TICK_MS = 40;

/**
 * The Wrapped player.
 *
 * **Each slide is the real card**, not a summary of one — the same component
 * the deck and the minted URL render, at 9:16 with `fill`. What someone
 * watches is exactly what they can post, which is the whole point of the
 * surface: the play button and the share button lead to the same artefact.
 *
 * It advances itself. A story you have to tap through twelve times is a
 * gallery; a story that moves on its own is something you watch. Holding
 * anywhere pauses — that is the gesture every story player has trained, and
 * it is the only way to actually read a slide you care about.
 *
 * Reduced motion turns the timer off entirely rather than speeding it up: for
 * a reader who has asked for less movement, a screen that changes under them
 * without a tap is the exact thing they asked not to have.
 */
export function StoryViewer({
  cards,
  onClose,
  year,
  startAt = 0,
  photos = {},
  provenance,
  example = false,
}: {
  cards: CardSpec[];
  /** Called with the frame the reader stopped on, so a caller can go there. */
  onClose: (landedOn: number) => void;
  year: number;
  /** Which card the reader opened. Opening the set plays from the cover. */
  startAt?: number;
  /** Photographic grounds by kind, read from the store by the page. */
  photos?: Record<string, { url: string; color: string }>;
  provenance?: string;
  example?: boolean;
}) {
  const [index, setIndex] = useState(startAt);
  const [elapsed, setElapsed] = useState(0);
  const [held, setHeld] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const card = cards[index];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    setAutoplay(!reduced.matches);
  }, []);

  const next = useCallback(() => {
    setElapsed(0);
    setIndex((i) => (i >= cards.length - 1 ? i : i + 1));
  }, [cards.length]);

  const prev = useCallback(() => {
    setElapsed(0);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const last = index >= cards.length - 1;

  // The clock. Stops on the last slide so the finale holds until dismissed.
  useEffect(() => {
    if (!autoplay || held || last) return;
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e + TICK_MS >= DWELL_MS) {
          setIndex((i) => Math.min(cards.length - 1, i + 1));
          return 0;
        }
        return e + TICK_MS;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [autoplay, held, last, cards.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(index);
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, index]);

  // The body must not scroll behind a full-bleed player.
  useEffect(() => {
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prior;
    };
  }, []);

  const startedAt = useRef(0);
  if (!card) return null;

  const fraction = (i: number) =>
    i < index ? 1 : i > index ? 0 : autoplay && !last ? elapsed / DWELL_MS : 1;

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-label={`Wrapped ${year}`}>
      <div className={styles.frame}>
        {/* One segment per card, filling as its slide plays. */}
        <div className={styles.bars} aria-hidden="true">
          {cards.map((c, i) => (
            <span key={c.kind} className={styles.bar}>
              <i className={styles.barFill} style={{ transform: `scaleX(${fraction(i)})` }} />
            </span>
          ))}
        </div>

        <div className={styles.slide} key={card.kind}>
          <WrappedCard
            eyebrow={card.eyebrow}
            kicker={card.kicker}
            headline={card.headline}
            lede={card.lede}
            body={card.body}
            slug={null}
            symbol={card.symbol}
            kind={card.kind}
            photo={photos[card.kind] ?? null}
            provenance={provenance ?? `Steadyhands · ${year} · read from your brokerage`}
            hue={card.hue}
            layout={card.layout}
            rarity={card.rarity}
            example={example}
            fill
          />
        </div>

        {/*
          * Tap zones over the card, not buttons beside it. Left third goes
          * back, the rest goes on, and a press-and-hold anywhere pauses —
          * pointer events rather than touch so a mouse behaves the same way.
          */}
        <button
          type="button"
          className={styles.zoneLeft}
          aria-label="Previous"
          onPointerDown={() => {
            startedAt.current = performance.now();
            setHeld(true);
          }}
          onPointerUp={() => {
            setHeld(false);
            if (performance.now() - startedAt.current < 250) prev();
          }}
          onPointerLeave={() => setHeld(false)}
        />
        <button
          type="button"
          className={styles.zoneRight}
          aria-label={last ? "Close" : "Next"}
          onPointerDown={() => {
            startedAt.current = performance.now();
            setHeld(true);
          }}
          onPointerUp={() => {
            setHeld(false);
            if (performance.now() - startedAt.current < 250) {
              if (last) onClose(index);
              else next();
            }
          }}
          onPointerLeave={() => setHeld(false)}
        />

        <div className={styles.foot}>
          {/* An example deck has nothing to mint, so the affordance is absent
              rather than present and refusing. */}
          {example ? <span className={styles.count}>Example ledger</span> : (
            <ShareButton type={card.kind} label="this card" size={40} onInk />
          )}
          <span className={styles.count}>
            {index + 1} / {cards.length}
          </span>
          <button type="button" className={styles.done} onClick={() => onClose(index)}>
            {last ? "Done" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
