"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./yeardeck.module.css";

/**
 * Your year, as a deck you flip. Never a gallery.
 *
 * A rail of cards laid out side by side is a contact sheet: it invites you to
 * scan twelve things at once and, at the size twelve things fit, none of them
 * is legible. That is the wrong shape for an artefact — a poster is looked at,
 * one at a time — and the wrong shape for this screen in particular, whose
 * whole job is *look how much you got*. So the cards are a pile, one on top,
 * the rest visible behind it as depth. The same grammar the landing's deck
 * uses, because it is the same object.
 *
 * Each card is a finished 1080×1920 document — its own stylesheet, faces and
 * palette — so it is framed rather than re-implemented. An iframe is the
 * honest container: a card's palette is saturated well past anything the app
 * uses, and putting twelve fixed stages into the app's own cascade would let
 * two vocabularies fight. `srcdoc` rather than a src, because the server
 * render already has the document in hand.
 *
 * The scale is CSS, so the stage stays 1080×1920 everywhere and only its
 * magnification changes — one drawing at three sizes rather than three layouts
 * to keep in step. `--card-w` is a plain number, not a length: `scale()` takes
 * a ratio, and `calc(300px / 1080)` is a *length*, which silently invalidates
 * the whole transform. It did, and the deck rendered twelve top-left crops —
 * all of them background art, because every card's type sits in its lower
 * third.
 */
export function YearDeck({
  cards,
  year,
}: {
  cards: Array<{ no: string; key: string; html: string; caption: string }>;
  year: number;
}) {
  const [at, setAt] = useState(0);
  const [full, setFull] = useState(false);
  const [drag, setDrag] = useState(0);
  const from = useRef<number | null>(null);

  const go = useCallback(
    (d: 1 | -1) => setAt((n) => Math.min(Math.max(n + d, 0), cards.length - 1)),
    [cards.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    if (!full) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [full]);

  if (!cards.length) return null;

  /* Drag the top card. Past a third of its width the flip commits. */
  const onDown = (e: React.PointerEvent) => {
    from.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (from.current == null) return;
    setDrag(e.clientX - from.current);
  };
  const onUp = () => {
    if (from.current == null) return;
    if (drag < -90 && at < cards.length - 1) go(1);
    else if (drag > 90 && at > 0) go(-1);
    from.current = null;
    setDrag(0);
  };

  const pile = (size: "deck" | "full") => (
    <div className={size === "full" ? styles.fullStage : styles.stage}>
      {cards.map((card, i) => {
        const rank = i - at;
        /* Behind the top card, and only the next few — a pile, not a fan. */
        if (rank < 0 || rank > 3) return null;
        const dragging = rank === 0 && drag !== 0;
        return (
          <div
            key={card.no}
            className={styles.card}
            data-top={rank === 0 ? "" : undefined}
            style={{
              zIndex: cards.length - rank,
              transform: dragging
                ? `translate(calc(-50% + ${drag}px), 0) rotate(${(drag * 0.03).toFixed(2)}deg)`
                : `translate(-50%, ${rank * 18}px) scale(${(1 - rank * 0.05).toFixed(3)})`,
              opacity: rank > 2 ? 0 : 1,
              transition: dragging ? "none" : "transform .34s cubic-bezier(.2,.8,.3,1), opacity .34s ease",
            }}
            onPointerDown={rank === 0 ? onDown : undefined}
            onPointerMove={rank === 0 ? onMove : undefined}
            onPointerUp={rank === 0 ? onUp : undefined}
            onPointerCancel={rank === 0 ? onUp : undefined}
          >
            <iframe
              className={styles.paper}
              srcDoc={card.html}
              title={card.caption || `Card ${card.no}`}
              loading={i < 3 ? "eager" : "lazy"}
              tabIndex={-1}
              scrolling="no"
            />
          </div>
        );
      })}
    </div>
  );

  const counter = (
    <p className={styles.counter}>
      <span className={styles.now}>{cards[at].no}</span>
      <span className={styles.of}>/ {String(cards.length).padStart(2, "0")}</span>
    </p>
  );

  return (
    <>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Wrapped · {year}</p>
          <h2 className={styles.h2}>
            Your year, in {cards.length} card{cards.length === 1 ? "" : "s"}
          </h2>
        </div>
        <button type="button" className={styles.play} onClick={() => setFull(true)}>
          Play your year
        </button>
      </div>

      <div className={styles.deck}>
        <button
          type="button"
          className={styles.arrow}
          data-side="back"
          onClick={() => go(-1)}
          disabled={at === 0}
          aria-label="Previous card"
        >
          <Chevron dir="left" />
        </button>

        {pile("deck")}

        <button
          type="button"
          className={styles.arrow}
          data-side="next"
          onClick={() => go(1)}
          disabled={at === cards.length - 1}
          aria-label="Next card"
        >
          <Chevron dir="right" />
        </button>
      </div>

      <div className={styles.foot}>
        {counter}
        <p className={styles.caption}>{cards[at].caption}</p>
      </div>

      {full ? (
        <div className={styles.player} role="dialog" aria-modal="true" aria-label="Your year">
          <div className={styles.ticks} aria-hidden="true">
            {cards.map((c, i) => (
              <span key={c.no} className={styles.tick} data-on={i <= at ? "" : undefined} />
            ))}
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={() => setFull(false)}
            aria-label="Close"
          >
            <Cross />
          </button>

          {/*
            Half the width steps back, half steps forward — the story grammar
            every reader already knows, and the reason there is no button to
            find. They sit under the pile so the drag still reaches the card.
          */}
          <button type="button" className={styles.back} onClick={() => go(-1)} aria-label="Previous" />
          <button
            type="button"
            className={styles.next}
            onClick={() => (at === cards.length - 1 ? setFull(false) : go(1))}
            aria-label="Next"
          />

          {pile("full")}
        </div>
      ) : null}
    </>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
